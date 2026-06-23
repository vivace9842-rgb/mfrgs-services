module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ status: "webhook endpoint active" });
  }
  return res.status(200).json({ received: true });
};