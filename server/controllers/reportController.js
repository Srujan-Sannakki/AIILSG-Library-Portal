import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import Report from '../models/Report.js';
import { text, phone, list } from '../services/validation.js';
import { audit } from '../services/audit.js';
import { HttpError } from '../middlewares/errorHandler.js';
const safe = r => ({ ...r.toObject(), id: String(r._id), time: r.createdAt.toISOString() });
export const listReports = async (req,res) => res.json(await list(Report,req.query,{},safe));
export async function createReport(req,res) {
  const { context, issue } = z.object({context:text,issue:z.string().trim().min(1).max(2000)}).strict().parse(req.body);
  let report;
  await mongoose.connection.transaction(async session => {
    [report] = await Report.create([{context,issue,userId:req.user.sid || req.user.id,date:new Date().toISOString().slice(0,10)}],{session});
    await audit(req,'Submit report',report._id,session);
  });
  res.status(201).json(safe(report));
}
export async function createEnquiry(req,res) {
  const {name,phone:contact,purpose,message} = z.object({name:text,phone:phone.refine(v=>v.length===10),purpose:text,message:z.string().trim().min(1).max(2000)}).strict().parse(req.body);
  await mongoose.connection.transaction(async session => {
    const [report] = await Report.create([{context:'Public Enquiry',userId:`${name} (${contact})`,purpose,issue:message,date:new Date().toISOString().slice(0,10)}],{session});
    // Public enquiries contain no caller-provided audit identity.
    await audit({user:{_id:randomUUID()},auth:{type:'anonymous'}},'Public enquiry',report._id,session);
  });
  res.status(201).json({success:true});
}
export async function updateReport(req,res) {
  const id = z.string().regex(/^[a-f0-9]{24}$/).parse(req.params.id);
  const data = z.object({officer:z.string().max(200).optional(),designation:z.string().max(200).optional(),status:z.enum(['Pending','Resolved']).optional()}).strict().parse(req.body);
  let report;
  await mongoose.connection.transaction(async session => {
    report=await Report.findByIdAndUpdate(id,{$set:data},{session,returnDocument:'after',runValidators:true});
    if(!report) throw new HttpError(404,'Report not found');
    await audit(req,'Update report',id,session);
  });
  res.json(safe(report));
}
