const bcrypt = require('bcryptjs');
const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run hash-password -- "your password"');
  process.exit(1);
}
bcrypt.hash(password, 12).then(console.log);
