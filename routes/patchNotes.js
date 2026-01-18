import express from "express";

const router = express.Router();

router.get("/", async (_, res) => {
  try {
    res.render("patchNotes");
  } catch (error) {
    console.error("Error:", error);
    // Handle the error and send an appropriate response
    res.status(500).send("Internal Server Error");
  }
});

export default router;
