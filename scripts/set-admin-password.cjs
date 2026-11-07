const { PrismaClient } = require("../src/generated/prisma");
const crypto = require("crypto");

const prisma = new PrismaClient();

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString("hex"));
    });
  });
  return `${salt}:${hash}`;
}

async function main() {
  const email = "nussbaumer@gmail.com";
  const password = "admin";
  
  let user = await prisma.user.findUnique({ where: { email } });
  const passwordHash = await hashPassword(password);
  
  if (user) {
    user = await prisma.user.update({ 
      where: { email }, 
      data: { 
        role: "ADMIN", 
        passwordHash 
      } 
    });
    console.log("Updated admin password for:", email);
  } else {
    user = await prisma.user.create({ 
      data: { 
        email, 
        passwordHash, 
        role: "ADMIN", 
        founder: true 
      } 
    });
    console.log("Created admin user:", email);
  }
}

main()
  .catch(async (e) => { 
    console.error(e); 
    await prisma.$disconnect(); 
    process.exit(1); 
  })
  .finally(async () => { 
    await prisma.$disconnect(); 
  });