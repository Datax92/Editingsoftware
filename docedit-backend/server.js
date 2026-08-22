const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const uploadDir = path.join(__dirname, 'uploads');

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// Mount modular API routes
app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`DocEdit Pro modular backend running on port ${PORT}`);
});