require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Department = require('../models/Department');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Staff = require('../models/Staff');
const Appointment = require('../models/Appointment');
const MedicalRecord = require('../models/MedicalRecord');
const LabTest = require('../models/LabTest');
const PharmacyItem = require('../models/PharmacyItem');
const Billing = require('../models/Billing');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const { ROLES } = require('../utils/permissions');

const daysAgo = (d) => {
  const x = new Date();
  x.setDate(x.getDate() - d);
  x.setHours(10, 0, 0, 0);
  return x;
};

const futureDays = (d) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  return x;
};

const seed = async () => {
  const alreadyConnected = mongoose.connection.readyState === 1;
  if (!alreadyConnected) await connectDB();
  console.log('Clearing existing data...');

  await Promise.all([
    User.deleteMany({}),
    Department.deleteMany({}),
    Doctor.deleteMany({}),
    Patient.deleteMany({}),
    Staff.deleteMany({}),
    Appointment.deleteMany({}),
    MedicalRecord.deleteMany({}),
    LabTest.deleteMany({}),
    PharmacyItem.deleteMany({}),
    Billing.deleteMany({}),
    Attendance.deleteMany({}),
    Leave.deleteMany({})
  ]);

  // Departments
  const depts = await Department.insertMany([
    { name: 'General Medicine', description: 'General physicians and internal medicine', head: 'Dr. R. Perera' },
    { name: 'Cardiology', description: 'Heart and vascular care', head: 'Dr. S. Fernando' },
    { name: 'Pediatrics', description: 'Child healthcare', head: 'Dr. N. Silva' },
    { name: 'Orthopedics', description: 'Bones and joint care', head: 'Dr. K. Jayawardena' },
    { name: 'Laboratory', description: 'Diagnostic laboratory services' },
    { name: 'Pharmacy', description: 'Medicine dispensing and inventory' }
  ]);

  // Users
  const hash = await bcrypt.hash('admin123', 10);
  await User.insertMany([
    { username: 'admin', name: 'System Administrator', email: 'admin@hms.lk', password: hash, role: 'admin' },
    { username: 'reception', name: 'Receptionist', email: 'reception@hms.lk', password: hash, role: 'receptionist' },
    { username: 'labtech', name: 'Lab Technician', email: 'lab@hms.lk', password: hash, role: 'lab' },
    { username: 'pharmacist', name: 'Pharmacist', email: 'pharmacy@hms.lk', password: hash, role: 'pharmacist' },
    { username: 'accountant', name: 'Accountant', email: 'account@hms.lk', password: hash, role: 'accountant' },
    { username: 'nurse', name: 'Senior Nurse', email: 'nurse@hms.lk', password: hash, role: 'nurse' }
  ]);

  // Staff
  const staff = await Staff.create([
    { name: 'Receptionist', nic: '900000001V', position: 'Receptionist', departmentId: depts[0]._id, salary: 45000 },
    { name: 'Lab Technician', nic: '900000002V', position: 'Lab Technician', departmentId: depts[4]._id, salary: 52000 },
    { name: 'Pharmacist', nic: '900000003V', position: 'Pharmacist', departmentId: depts[5]._id, salary: 55000 },
    { name: 'Accountant', nic: '900000004V', position: 'Accountant', departmentId: depts[0]._id, salary: 50000 },
    { name: 'Senior Nurse', nic: '900000005V', position: 'Nurse', departmentId: depts[0]._id, salary: 48000 }
  ]);

  // Doctors
  const doctors = await Doctor.create([
    { name: 'Dr. R. Perera', specialization: 'General Physician', departmentId: depts[0]._id, fees: 2000, phone: '0111111111', email: 'r.perera@hms.lk', schedule: [{ day: 'Monday', start: '09:00', end: '13:00' }, { day: 'Wednesday', start: '09:00', end: '13:00' }] },
    { name: 'Dr. S. Fernando', specialization: 'Cardiologist', departmentId: depts[1]._id, fees: 3500, phone: '0112222222', email: 's.fernando@hms.lk', schedule: [{ day: 'Tuesday', start: '14:00', end: '18:00' }, { day: 'Thursday', start: '09:00', end: '13:00' }] },
    { name: 'Dr. N. Silva', specialization: 'Pediatrician', departmentId: depts[2]._id, fees: 2500, phone: '0113333333', email: 'n.silva@hms.lk', schedule: [{ day: 'Monday', start: '14:00', end: '18:00' }, { day: 'Friday', start: '09:00', end: '13:00' }] },
    { name: 'Dr. K. Jayawardena', specialization: 'Orthopedic Surgeon', departmentId: depts[3]._id, fees: 3000, phone: '0114444444', email: 'k.jayawardena@hms.lk' }
  ]);

  // Patients
  const patientNames = [
    ['Kamal Perera', 'Male', 'O+'], ['Sunil Fernando', 'Male', 'B+'], ['Nimali Silva', 'Female', 'A+'],
    ['Ruwan Jayasuriya', 'Male', 'O-'], ['Dilani Wickramasinghe', 'Female', 'AB+'], ['Chamara Herath', 'Male', 'B-'],
    ['Sachini Bandara', 'Female', 'O+'], ['Nuwan Perera', 'Male', 'A-']
  ];
  const patients = [];
  for (let i = 0; i < patientNames.length; i++) {
    patients.push(
      await Patient.create({
        name: patientNames[i][0],
        gender: patientNames[i][1],
        bloodGroup: patientNames[i][2],
        dob: new Date(1980 + i, (i * 3) % 12, 15),
        phone: `077${String(1000000 + i * 111111).slice(0, 7)}`,
        email: patientNames[i][0].toLowerCase().replace(/ /g, '.') + '@gmail.com',
        address: `${i + 10}, Galle Road, Colombo ${(i % 10) + 1}`,
        emergencyContact: '0777654321'
      })
    );
  }

  // Appointments (some past/completed, some future)
  for (let i = 0; i < 10; i++) {
    const p = patients[i % patients.length];
    const doc = doctors[i % doctors.length];
    const scheduled = i < 4 ? futureDays(i + 1) : daysAgo(i - 3);
    await Appointment.create({
      patientId: p._id,
      doctorId: doc._id,
      date: scheduled,
      time: ['09:00', '09:30', '10:00', '10:30', '11:00'][i % 5],
      type: i % 3 === 0 ? 'Follow-up' : i % 3 === 1 ? 'Consultation' : 'Checkup',
      status: i < 4 ? 'scheduled' : i < 8 ? 'completed' : 'cancelled',
      reason: 'Routine consultation',
      createdBy: null
    }).catch(() => {});
  }

  // Medical records with prescriptions
  const adminUser = await User.findOne({ username: 'admin' });
  for (let i = 0; i < 5; i++) {
    await MedicalRecord.create({
      patientId: patients[i]._id,
      doctorId: doctors[i % doctors.length]._id,
      date: daysAgo(i + 2),
      visitType: i % 4 === 0 ? 'OPD' : 'Follow-up',
      symptoms: ['Fever and headache', 'Chest pain on exertion', 'Cough and cold', 'Joint pain in knees', 'Fatigue'][i],
      diagnosis: ['Upper respiratory tract infection', 'Hypertension', 'Common cold', 'Osteoarthritis', 'Iron deficiency anemia'][i],
      treatmentPlan: ['Rest and fluids, antibiotics', 'Lifestyle changes and medication', 'Antihistamines and rest', 'Physiotherapy and anti-inflammatory', 'Iron supplements and diet'][i],
      vitalSigns: { temperature: '98.6F', pulse: '72', bloodPressure: '120/80', weight: '65kg', height: '170cm' },
      prescriptions: [
        { medicine: 'Paracetamol 500mg', dosage: '1 tablet', frequency: '3 times daily', duration: '5 days' },
        { medicine: 'Amoxicillin 250mg', dosage: '1 capsule', frequency: '2 times daily', duration: '7 days' }
      ],
      createdBy: adminUser._id
    });
  }

  // Lab tests
  for (let i = 0; i < 6; i++) {
    const p = patients[i];
    const completed = i < 3;
    await LabTest.create({
      patientId: p._id,
      doctorId: doctors[0]._id,
      testName: ['Full Blood Count', 'Blood Sugar (FBS)', 'Lipid Profile', 'Urine Analysis', 'ECG', 'X-Ray Chest'][i],
      category: ['Blood', 'Blood', 'Blood', 'Urine', 'Other', 'Imaging'][i],
      status: completed ? 'completed' : i < 5 ? 'sample-collected' : 'requested',
      result: completed ? 'Normal ranges observed' : undefined,
      resultDate: completed ? daysAgo(1) : undefined,
      normal: completed ? 'normal' : '',
      referenceRange: 'See lab manual',
      requestedBy: adminUser._id
    });
  }

  // Pharmacy items
  await PharmacyItem.insertMany([
    { code: 'PARA500', name: 'Paracetamol 500mg', category: 'Tablet', batchNo: 'B2201', manufacturer: 'Ceylon Pharma', quantity: 500, unitPrice: 5, sellingPrice: 12, expiryDate: futureDays(400), supplier: 'Distributor A', reorderLevel: 100 },
    { code: 'AMOX250', name: 'Amoxicillin 250mg', category: 'Capsule', batchNo: 'B2202', manufacturer: 'State Pharma', quantity: 40, unitPrice: 15, sellingPrice: 30, expiryDate: futureDays(200), supplier: 'Distributor A', reorderLevel: 50 },
    { code: 'MET500', name: 'Metformin 500mg', category: 'Tablet', batchNo: 'B2203', manufacturer: 'Ceylon Pharma', quantity: 800, unitPrice: 4, sellingPrice: 10, expiryDate: futureDays(600), supplier: 'Distributor B', reorderLevel: 150 },
    { code: 'INS100', name: 'Insulin 100IU', category: 'Injection', batchNo: 'B2204', manufacturer: 'Global Meds', quantity: 20, unitPrice: 25, sellingPrice: 60, expiryDate: futureDays(15), supplier: 'Distributor C', reorderLevel: 30 },
    { code: 'IBU400', name: 'Ibuprofen 400mg', category: 'Tablet', batchNo: 'B2205', manufacturer: 'Ceylon Pharma', quantity: 12, unitPrice: 6, sellingPrice: 15, expiryDate: futureDays(500), supplier: 'Distributor A', reorderLevel: 50 },
    { code: 'ZINC10', name: 'Zinc Syrup 10ml', category: 'Syrup', batchNo: 'B2206', manufacturer: 'KidsCare', quantity: 75, unitPrice: 18, sellingPrice: 40, expiryDate: futureDays(90), supplier: 'Distributor B', reorderLevel: 25 },
    { code: 'BANDAID', name: 'Band Aid (per box)', category: 'Dressing', batchNo: 'B2207', manufacturer: 'MediCare', quantity: 60, unitPrice: 20, sellingPrice: 45, expiryDate: futureDays(700), supplier: 'Distributor A', reorderLevel: 30 }
  ]);

  // Billing invoices
  const invoiceItems = [
    { description: 'Consultation - General Physician', category: 'Consultation', quantity: 1, unitPrice: 2000, amount: 2000 },
    { description: 'Full Blood Count', category: 'Laboratory', quantity: 1, unitPrice: 1500, amount: 1500 },
    { description: 'Paracetamol 500mg (10)', category: 'Pharmacy', quantity: 1, unitPrice: 120, amount: 120 },
    { description: 'ECG Test', category: 'Laboratory', quantity: 1, unitPrice: 2500, amount: 2500 },
    { description: 'Consultation - Cardiologist', category: 'Consultation', quantity: 1, unitPrice: 3500, amount: 3500 },
    { description: 'X-Ray Chest', category: 'Laboratory', quantity: 1, unitPrice: 3000, amount: 3000 }
  ];
  for (let i = 0; i < 6; i++) {
    const items = [invoiceItems[i % invoiceItems.length]];
    if (i % 2) items.push(invoiceItems[(i + 1) % invoiceItems.length]);
    const itemTotal = items.reduce((s, x) => s + x.amount, 0);
    const paid = i < 4;
    await Billing.create({
      patientId: patients[i]._id,
      items,
      discount: 0,
      tax: 0,
      createdBy: adminUser._id,
      payments: paid ? [{ amount: itemTotal, method: 'Cash', receivedBy: adminUser._id }] : []
    });
  }

  // Attendance for the past week
  const today = new Date();
  for (let d = 0; d < 7; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - d));
    for (const s of staff) {
      await Attendance.create({
        staffId: s._id,
        date,
        timeIn: '08:30',
        timeOut: '16:30',
        status: d === 5 || d === 6 ? 'absent' : 'present',
        markedBy: adminUser._id
      }).catch(() => {});
    }
  }

  // One pending leave request
  await Leave.create({
    staffId: staff[0]._id,
    startDate: futureDays(10),
    endDate: futureDays(12),
    type: 'Annual',
    reason: 'Personal',
    status: 'pending'
  });

  console.log('-----------------------------');
  console.log('Seed completed successfully!');
  console.log('Demo accounts (all passwords: admin123):');
  console.log('  admin        (Administrator)');
  console.log('  reception    (Receptionist)');
  console.log('  nurse        (Nurse)');
  console.log('  labtech      (Lab Technician)');
  console.log('  pharmacist   (Pharmacist)');
  console.log('  accountant   (Accountant)');
  console.log('-----------------------------');
};

if (require.main === module) {
  const { disconnectDB } = require('../config/db');
  seed()
    .then(async () => {
      await disconnectDB();
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
} else {
  module.exports = { seed };
}