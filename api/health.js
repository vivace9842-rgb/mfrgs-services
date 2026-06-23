module.exports = (req, res) => {
  res.status(200).json({
    status: "online",
    project: "MFRGS Services",
    version: "1.0.0"
  });
};
