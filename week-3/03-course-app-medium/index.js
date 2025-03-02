const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const fs = require('fs');
const SECRET_KEY = "S3CR3T_K3Y"
const cors = require('cors')

app.use(express.json());
app.use(cors())

let ADMINS = [];
let USERS = [];
let COURSES = [];

try {
  ADMINS = JSON.parse(fs.readFileSync('admin.json', 'utf8'));
  USERS = JSON.parse(fs.readFileSync('user.json', 'utf8'));
  COURSES = JSON.parse(fs.readFileSync('course.json', 'utf8'));
} catch (err) {
  // console.log(err)
  ADMINS = [];
  USERS = [];
  COURSES = [];
}


const generateJwt = (username, role) => {
  const token = jwt.sign({ username, role }, SECRET_KEY, { expiresIn: '1h' })
  return token;
}

const verifyJwt = (req, res, next) => {
  authToken = req.headers.authorization

  if (authToken) {
    const token = authToken.split(" ")[1];
    jwt.verify(token, SECRET_KEY, (error, user) => {
      if (error) {
        res.status(403).json({ message: "Authentication failed" });
      } else {
        req.user = user;
        next();
      }
    })
  } else {
    res.status(401).json({message:"No token"})
  }
}


// Admin routes 
app.post('/admin/signup', (req, res) => {
  const { username, password } = req.body
  const adminExists = ADMINS.find(a => a.username === username)

  if (adminExists) {
    res.status(403).json({ message: "Admin already exists" })
  } else {
    ADMINS.push({ username, password })
    const token = generateJwt(username, 'admin')
    fs.writeFileSync("admin.json", JSON.stringify(ADMINS))
    res.status(200).json({ message: 'Admin created successfully', token })
  }
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.headers
  const adminExists = ADMINS.find(a => a.username === username && a.password === password)

  if (!adminExists) {
    res.status(403).json({ message: "Admin does not exists" })
  } else {
    const token = generateJwt(username, 'admin')
    res.status(200).json({ message: 'Logged in successfully', token })
  }
}); 
app.post('/admin/loggedin', verifyJwt, (req, res) => {
  res.status(200).json({ message: "Logged in" })
});

app.post('/admin/courses', verifyJwt, (req, res) => {
  const course = req.body;
  course.id = COURSES.length + 1;
  COURSES.push(course);
  fs.writeFileSync("course.json", JSON.stringify(COURSES))
  res.status(200).json({ message: 'Course created successfully', courseId: course.id })
});

app.put('/admin/courses/:courseId', verifyJwt, (req, res) => {
  const course = COURSES.find(c => c.id === parseInt(req.params.courseId))
  if (course) {
    Object.assign(course, req.body);
    fs.writeFileSync("course.json", JSON.stringify(COURSES))
    res.status(200).json({ message: 'Course updated successfully' })
  } else {
    res.status(404).json({ message: 'Course not found' })
  }
});

app.get('/admin/courses', verifyJwt, (req, res) => {
  res.status(200).json({ courses: COURSES })
});

// User routes
app.post('/users/signup', (req, res) => {
  const { username, password } = req.body
  const userExists = ADMINS.find(a => a.username === username)

  if (userExists) {
    res.status(403).json({ message: "User already exists" })
  } else {
    USERS.push({ username, password, purchasedCourses: [] })
    const token = generateJwt(username, 'user')
    fs.writeFileSync("user.json", JSON.stringify(USERS))
    res.status(200).json({ message: 'user created successfully', token })
  }
});

app.post('/users/login', (req, res) => {
  const { username, password } = req.headers
  const userExists = USERS.find(a => a.username === username && a.password === password)

  if (!userExists) {
    res.status(403).json({ message: "User does not exists" })
  } else {
    const token = generateJwt(username, 'user')
    res.status(200).json({ message: 'Logged in successfully', token })
  }
});

app.get('/users/courses', verifyJwt, (req, res) => {
  console.log(COURSES);
  const availableCourses = COURSES.filter(a => a.published)
  res.status(200).json({ courses: availableCourses })
});

app.post('/users/courses/:courseId', verifyJwt, (req, res) => {
  const course = COURSES.find(a => a.id === parseInt(req.params.courseId))
  if (course) {
    const user = USERS.find(u => u.username === req.user.username)
    if (user) {
      user.purchasedCourses.push(course);
      fs.writeFileSync("user.json", JSON.stringify(USERS))
      res.status(200).json({ message: 'Course purchased successfully' });
    } else {
      res.status(403).json({ message: "User not found" })
    }
  } else {
    res.status(404).json({ message: "Course not found" })
  }
});

app.get('/users/purchasedCourses', verifyJwt, (req, res) => {
  const user = USERS.find(u => u.username === req.user.username)
  if (user) {
    res.status(200).json({ courses: user.purchasedCourses })
  } else {
    res.status(403).json({ message: "User not found" })

  }
});

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
