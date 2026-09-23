import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { PDFDocument } from 'pdf-lib';
import bcrypt from 'bcryptjs';
let mongo, app, mongoose, User, Admin, Book, Inventory, AuditLog, Session, Blacklist, dir;
let student, other, core, limited, studentToken, otherToken, adminToken, limitedToken, pdf;
const secretPassword = 'Test-password-12345';
const bearer = token => ({ Authorization: `Bearer ${token}` });
async function login(id, password = secretPassword) { const r = await request(app).post('/api/login').send({ id, password }).expect(200); return r.body.token; }
before(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'aiilsg-test-'));
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  Object.assign(process.env, { NODE_ENV: 'test', MONGO_URI: mongo.getUri(), JWT_SECRET: 'b'.repeat(64), CLIENT_ORIGIN: 'http://localhost:5173', PRIVATE_STORAGE_DIR: dir });
  ({ app } = await import('../app.js')); mongoose = (await import('mongoose')).default;
  await (await import('../config/db.js')).connectDB();
  [User, Admin, Book, Inventory, AuditLog, Session, Blacklist] = await Promise.all(['User', 'Admin', 'Book', 'Inventory', 'AuditLog', 'Session', 'TokenBlacklist'].map(async n => (await import(`../models/${n}.js`)).default));
  await Promise.all(Object.values(mongoose.models).map(m => m.init()));
  const hash = await bcrypt.hash(secretPassword, 12);
  [student, other] = await User.create([{ sid: '111111111111111', name: 'Test Student', password: hash, totalFee: 100, paidAmount: 50, validFrom: '2020-01-01', validUntil: '2099-12-31', access: ['book1'] }, { sid: '222222222222222', name: 'Other Student', password: hash }]);
  [core, limited] = await Admin.create([{ id: 'test-core', name: 'Core', password: hash, role: 'super_admin', isCore: true }, { id: 'test-librarian', name: 'Librarian', password: hash, role: 'limited_admin' }]);
  [studentToken, otherToken, adminToken, limitedToken] = await Promise.all([login(student.sid), login(other.sid), login(core.id), login(limited.id)]);
  const doc = await PDFDocument.create(); doc.addPage().drawText('AUTHORIZED PAGE'); doc.addPage().drawText('LOCKED PAGE'); pdf = Buffer.from(await doc.save());
});
after(async () => { await mongoose?.disconnect(); await mongo?.stop(); if (dir) await rm(dir, { recursive: true, force: true }); });
test('safe login/me responses omit hashes and internal fields', async () => {
  const r = await request(app).get('/api/me').set(bearer(studentToken)).expect(200);
  for (const field of ['password', 'tokenVersion', 'active', 'sessionCounter', '__v']) assert.equal(r.body[field], undefined);
});
test('prototype short default passwords are rejected before authentication', async () => { await request(app).post('/api/login').send({id:'admin',password:'admin'}).expect(400); });
test('students cannot enumerate private lists', async () => { for (const url of ['users','admins','visitors','transactions','inventory','logs']) await request(app).get(`/api/${url}`).set(bearer(studentToken)).expect(403); });
test('mass assignment, operator injection and cross-user profile updates fail', async () => {
  await request(app).put(`/api/users/${student._id}`).set(bearer(studentToken)).send({ role: 'super_admin' }).expect(400);
  await request(app).put(`/api/users/${student._id}`).set(bearer(studentToken)).send({ $set: { role: 'super_admin' } }).expect(400);
  await request(app).put(`/api/users/${other._id}/profile`).set(bearer(studentToken)).send({ name: 'Hijacked' }).expect(403);
  await request(app).post('/api/login').send({ id: { $ne: null }, password: secretPassword }).expect(400);
  await request(app).put(`/api/users/${student.sid}/profile`).set(bearer(studentToken)).send({ name: 'Updated Student' }).expect(200);
});
test('limited admins cannot manage admins, fees, settings or permissions', async () => {
  await request(app).post('/api/admins').set(bearer(limitedToken)).send({ id: 'evil', name: 'Evil', role: 'super_admin', password: secretPassword }).expect(403);
  await request(app).delete(`/api/admins/${core.id}`).set(bearer(limitedToken)).expect(403);
  for (const endpoint of ['fees','permissions']) await request(app).put(`/api/users/${student.sid}/${endpoint}`).set(bearer(limitedToken)).send({}).expect(403);
  await request(app).put('/api/settings').set(bearer(limitedToken)).send({ maintenanceMode: true }).expect(403);
});
test('core admin cannot be deleted', async () => { await request(app).delete(`/api/admins/${core.id}`).set(bearer(adminToken)).expect(403); assert.ok(await Admin.exists({ _id: core._id })); });
test('admin lists are bounded and paginated', async () => {
  const r = await request(app).get('/api/users?limit=1&offset=1').set(bearer(adminToken)).expect(200);
  assert.equal(r.body.items.length, 1); assert.equal(r.body.total, 2);
  await request(app).get('/api/users?limit=10000').set(bearer(adminToken)).expect(400);
});
test('PDF upload validates signature, MIME, size, and actual page count', async () => {
  await request(app).post('/api/books').set(bearer(adminToken)).field('title','Fake').field('customId','fake').attach('pdf', Buffer.from('not a pdf'), { filename: 'fake.pdf', contentType: 'application/pdf' }).expect(415);
  await request(app).post('/api/books').set(bearer(adminToken)).field('title','Fake').field('customId','fake').attach('pdf',pdf,{filename:'fake.html',contentType:'text/html'}).expect(415);
  await request(app).post('/api/books').set(bearer(adminToken)).field('title','Large').field('customId','large').attach('pdf', Buffer.alloc(20*1024*1024+1),{filename:'large.pdf',contentType:'application/pdf'}).expect(413);
  const r = await request(app).post('/api/books').set(bearer(adminToken)).field('title','Test book').field('customId','book1').field('totalPages','999').attach('pdf',pdf,{filename:'book.pdf',contentType:'application/pdf'}).expect(201);
  assert.equal(r.body.totalPages,2); assert.equal(r.body.storageKey,undefined);
});
test('book list hides storage URLs and unaffiliated books', async () => {
  const r = await request(app).get('/api/books').set(bearer(studentToken)).expect(200);
  assert.equal(r.body.items.length,1); assert.equal(r.body.items[0].entitledPages,1);
  assert.equal(r.body.items[0].filePath,undefined); assert.equal(r.body.items[0].storageKey,undefined);
  const otherBooks = await request(app).get('/api/books').set(bearer(otherToken)).expect(200); assert.equal(otherBooks.body.items.length,0);
});
test('delivery returns exactly one entitled PDF page; no original public URL', async () => {
  const r = await request(app).get('/api/books/book1/pages/1').set(bearer(studentToken)).expect(200);
  assert.equal(r.headers['cache-control'],'private, no-store');
  const page = await PDFDocument.load(r.body); assert.equal(page.getPageCount(),1);
  await request(app).get('/api/books/book1/pages/2').set(bearer(studentToken)).expect(403);
  await request(app).get('/api/books/book1/pages/1').set(bearer(otherToken)).expect(403);
  await request(app).get('/api/books/book1/pages/1').expect(401);
  await request(app).get('/uploads/book.pdf').expect(404);
});
test('expiry, assignments and fee edits immediately affect delivery', async () => {
  await request(app).put(`/api/users/${student.sid}/permissions`).set(bearer(adminToken)).send({validUntil:'2021-01-01'}).expect(200);
  await request(app).get('/api/books/book1/pages/1').set(bearer(studentToken)).expect(403);
  await request(app).put(`/api/users/${student.sid}/permissions`).set(bearer(adminToken)).send({validUntil:'2099-12-31',access:['book1']}).expect(200);
  await request(app).put(`/api/users/${student.sid}/fees`).set(bearer(adminToken)).send({paidAmount:100}).expect(200);
  await request(app).get('/api/books/book1/pages/2').set(bearer(studentToken)).expect(200);
  await request(app).put(`/api/users/${student.sid}/permissions`).set(bearer(adminToken)).send({access:[]}).expect(200);
  await request(app).get('/api/books/book1/pages/1').set(bearer(studentToken)).expect(403);
});
test('inventory rejects invalid quantities and simultaneous over-issue', async () => {
  await request(app).post('/api/inventory').set(bearer(adminToken)).send({itemId:'stock1',name:'Stock',type:'Book',openingStock:5}).expect(201);
  for (const quantity of [-1,0,1.5]) await request(app).post('/api/transactions').set(bearer(limitedToken)).send({itemId:'stock1',type:'ISSUE',quantity,particular:'Test'}).expect(400);
  const results = await Promise.all([1,2].map(() => request(app).post('/api/transactions').set(bearer(limitedToken)).send({itemId:'stock1',type:'ISSUE',quantity:4,particular:'Test'})));
  assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
  assert.equal((await Inventory.findOne({itemId:'stock1'})).currentStock,1);
  assert.equal(await mongoose.models.StockTransaction.countDocuments({itemId:'stock1'}),1);
  assert.equal(await AuditLog.countDocuments({action:'Stock transaction'}),1);
});
test('audit entries use server identity and cannot be forged or cleared', async () => {
  await request(app).post('/api/logs').set(bearer(studentToken)).send({action:'Fake',actorId:'other'}).expect(404);
  await request(app).delete('/api/logs').set(bearer(adminToken)).expect(404);
  const log = await AuditLog.findOne({action:'Update fees'}); assert.equal(log.actorId,String(core._id)); assert.ok(log.timestamp instanceof Date);
});
test('password reset revokes every active session and blacklists token IDs', async () => {
  const second = await login(student.sid);
  await request(app).post(`/api/users/${student.sid}/reset-password`).set(bearer(adminToken)).send({newPassword:'New-password-12345'}).expect(200);
  for (const token of [studentToken,second]) await request(app).get('/api/me').set(bearer(token)).expect(401);
  assert.equal(await Session.countDocuments({accountId:String(student._id)}),0);
  assert.ok(await Blacklist.countDocuments() >= 2);
  await login(student.sid,'New-password-12345');
});
test('deleting users and administrators revokes sessions', async () => {
  await request(app).delete(`/api/users/${other.sid}`).set(bearer(adminToken)).expect(200);
  await request(app).get('/api/me').set(bearer(otherToken)).expect(401);
  await request(app).delete(`/api/admins/${limited.id}`).set(bearer(adminToken)).expect(200);
  await request(app).get('/api/me').set(bearer(limitedToken)).expect(401);
});
test('new accounts persist safely and self-service password changes require the current password', async () => {
  const created = await request(app).post('/api/users').set(bearer(adminToken)).send({sid:'333333333333333',name:'Created Student',password:secretPassword,totalFee:0,validFrom:'2020-01-01',validUntil:'2099-12-31',academicYear:'2026'}).expect(201);
  assert.equal(created.body.password,undefined);
  const token = await login('333333333333333');
  await request(app).put('/api/users/333333333333333/password').set(bearer(token)).send({currentPassword:'wrong',newPassword:'Changed-password-123'}).expect(400);
  await request(app).put('/api/users/333333333333333/password').set(bearer(token)).send({currentPassword:secretPassword,newPassword:'Changed-password-123'}).expect(200);
  await request(app).get('/api/me').set(bearer(token)).expect(401);
  const changedToken = await login('333333333333333','Changed-password-123');
  const report = await request(app).post('/api/reports').set(bearer(changedToken)).send({context:'Library',issue:'Test report'}).expect(201);
  assert.equal(report.body.userId,'333333333333333');
  await request(app).put(`/api/reports/${report.body.id}`).set(bearer(adminToken)).send({status:'Resolved'}).expect(200);
  await request(app).post('/api/visitors').set(bearer(adminToken)).send({name:'Test Visitor',date:'2026-09-23',purpose:'Read'}).expect(201);
  await request(app).post('/api/enquiries').send({name:'Test Enquirer',phone:'0000000000',purpose:'Library',message:'Test enquiry'}).expect(201);
  const logs = await request(app).get('/api/logs?limit=100').set(bearer(adminToken)).expect(200);
  assert.ok(logs.body.items.some(log=>log.action==='Submit report'));
});
test('maintenance is enforced on both login and existing student sessions', async () => {
  const token = await login('333333333333333','Changed-password-123');
  await request(app).put('/api/settings').set(bearer(adminToken)).send({maintenanceMode:true}).expect(200);
  await request(app).get('/api/me').set(bearer(token)).expect(403);
  await request(app).post('/api/login').send({id:'333333333333333',password:'Changed-password-123'}).expect(403);
  await request(app).get('/api/me').set(bearer(adminToken)).expect(200);
  await request(app).put('/api/settings').set(bearer(adminToken)).send({maintenanceMode:false}).expect(200);
  await request(app).get('/api/me').set(bearer(token)).expect(200);
});
test('logout revokes token; login throttling activates', async () => {
  await request(app).post('/api/logout').set(bearer(adminToken)).expect(200);
  await request(app).get('/api/me').set(bearer(adminToken)).expect(401);
  let last;
  for (let i=0;i<21;i++) last=await request(app).post('/api/login').send({id:'missing',password:'bad'});
  assert.equal(last.status,429);
});
