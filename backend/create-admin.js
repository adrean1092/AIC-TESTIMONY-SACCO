const bcrypt = require('bcryptjs');
const pool = require('./db');

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const idNumber = Math.floor(10000000 + Math.random() * 90000000).toString();

  try {
    const result = await pool.query(
      `INSERT INTO users 
      (full_name, id_number, email, phone, password, role, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, email, role`,
      ['Admin User', idNumber, 'admin@sacco.com', '0700000000', hashedPassword, 'ADMIN']
    );

    console.log('✅ Fresh admin created!');
    console.log('Email: admin@sacco.com');
    console.log('Password: admin123');
    console.log('User:', result.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating admin:', err.message);
    process.exit(1);
  }
}

createAdmin();
