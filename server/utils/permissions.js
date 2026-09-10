const ROLES = ['admin', 'doctor', 'nurse', 'receptionist', 'lab', 'pharmacist', 'accountant'];

const ACTIONS = ['create', 'read', 'update', 'delete'];

const MODULES = [
  'users',
  'patients',
  'doctors',
  'appointments',
  'records',
  'lab',
  'pharmacy',
  'billing',
  'staff',
  'reports',
  'audit'
];

const PERMISSIONS = {
  admin: {
    users: ['create', 'read', 'update', 'delete'],
    patients: ['create', 'read', 'update', 'delete'],
    doctors: ['create', 'read', 'update', 'delete'],
    appointments: ['create', 'read', 'update', 'delete'],
    records: ['create', 'read', 'update', 'delete'],
    lab: ['create', 'read', 'update', 'delete'],
    pharmacy: ['create', 'read', 'update', 'delete'],
    billing: ['create', 'read', 'update', 'delete'],
    staff: ['create', 'read', 'update', 'delete'],
    reports: ['read'],
    audit: ['read']
  },
  doctor: {
    patients: ['read'],
    doctors: ['read'],
    appointments: ['create', 'read', 'update'],
    records: ['create', 'read', 'update'],
    lab: ['create', 'read'],
    pharmacy: ['read'],
    billing: ['read'],
    reports: ['read']
  },
  nurse: {
    patients: ['read', 'update'],
    doctors: ['read'],
    appointments: ['read', 'update'],
    records: ['read', 'update'],
    lab: ['read', 'update'],
    pharmacy: ['read'],
    billing: ['read'],
    reports: ['read']
  },
  receptionist: {
    patients: ['create', 'read', 'update'],
    doctors: ['read'],
    appointments: ['create', 'read', 'update', 'delete'],
    records: ['read'],
    lab: ['read'],
    pharmacy: ['read'],
    billing: ['create', 'read', 'update'],
    reports: ['read']
  },
  lab: {
    patients: ['read'],
    doctors: ['read'],
    appointments: ['read'],
    lab: ['create', 'read', 'update'],
    pharmacy: ['read'],
    billing: ['read'],
    reports: ['read']
  },
  pharmacist: {
    patients: ['read'],
    doctors: ['read'],
    appointments: ['read'],
    records: ['read'],
    lab: ['read'],
    pharmacy: ['create', 'read', 'update'],
    billing: ['read'],
    reports: ['read']
  },
  accountant: {
    patients: ['read'],
    doctors: ['read'],
    appointments: ['read'],
    billing: ['create', 'read', 'update', 'delete'],
    reports: ['read']
  }
};

const can = (role, module, action) => {
  const perms = PERMISSIONS[role];
  if (!perms || !perms[module]) return false;
  return perms[module].includes(action);
};

module.exports = { ROLES, ACTIONS, MODULES, PERMISSIONS, can };