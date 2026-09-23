import mongoose from 'mongoose';
const visitorSchema = new mongoose.Schema({
  date: String,
  sid: String,
  name: String,
  course: String,
  purpose: String,
  timeIn: String,
  timeOut: String,
  phone: String,
  feedback: String,
  officerName: String
});
const Visitor = mongoose.model('Visitor', visitorSchema);
export default Visitor;
