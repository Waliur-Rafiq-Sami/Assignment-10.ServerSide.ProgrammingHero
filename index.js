const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 5000;
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection URI
const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.he4nr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

let client;
async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    await client.connect();
    console.log("Connected to MongoDB!");
  }
  return client;
}

// API Routes
app.get("/", (req, res) => {
  res.send("Hello World");
});

// Get all items
app.get("/artAndCraft", async (req, res) => {
  try {
    const dbClient = await connectToDatabase();
    const collection = dbClient
      .db("insertDB")
      .collection("artAndCraftCollectionData");
    const results = await collection.find().toArray();
    res.send(results);
  } catch (error) {
    console.error("Error fetching artAndCraft:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// Get items by category
app.get("/artAndCraft/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const dbClient = await connectToDatabase();
    const collection = dbClient
      .db("insertDB")
      .collection("artAndCraftCollectionData");
    const results = await collection.find({ category: id }).toArray();
    res.send(results);
  } catch (error) {
    console.error("Error fetching category items:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// Get item by ID
app.get("/update/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ error: "Invalid ID format" });
    }
    const dbClient = await connectToDatabase();
    const collection = dbClient
      .db("insertDB")
      .collection("artAndCraftCollectionData");
    const result = await collection.findOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (error) {
    console.error("Error fetching item:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// Add new item
app.post("/addItem", async (req, res) => {
  try {
    const data = req.body;
    const dbClient = await connectToDatabase();
    const collection = dbClient
      .db("insertDB")
      .collection("artAndCraftCollectionData");
    const result = await collection.insertOne(data);
    res.send(result);
  } catch (error) {
    console.error("Error adding item:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// Update item
app.post("/update/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ error: "Invalid ID format" });
    }
    const data = req.body;
    const dbClient = await connectToDatabase();
    const collection = dbClient
      .db("insertDB")
      .collection("artAndCraftCollectionData");

    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        title: data.title,
        photo: data.photo,
        location: data.location,
        price: data.price,
        category: data.category,
        description: data.description,
        submittedAt: data.submittedAt,
      },
    };

    const result = await collection.updateOne(filter, updateDoc, {
      upsert: true,
    });
    res.send(result);
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// User collection
const userCollectionName = "userCollection";

// Add item to user's view list
app.put("/addList", async (req, res) => {
  try {
    const data = req.body;
    const dbClient = await connectToDatabase();
    const collection = dbClient.db("insertDB").collection(userCollectionName);

    const checkDuplicate = await collection.findOne({ email: data.email });
    const isMatch = checkDuplicate?.data.find(
      (d) => d._id === data.data[0]._id
    );

    if (isMatch) {
      return res.send({ found: "duplicateFound" });
    }

    const filter = { email: data.email };
    const updateDoc = {
      $setOnInsert: { email: data.email },
      $push: { data: data.data[0] },
    };

    const result = await collection.updateOne(filter, updateDoc, {
      upsert: true,
    });
    res.send(result);
  } catch (error) {
    console.error("Error adding to view list:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// Get user's view list
app.get("/viewList", async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) {
      return res.status(400).send({ error: "Email is required" });
    }
    const dbClient = await connectToDatabase();
    const collection = dbClient.db("insertDB").collection(userCollectionName);
    const userCards = await collection.findOne({ email });
    res.send(userCards?.data || []);
  } catch (error) {
    console.error("Error fetching view list:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// Delete item from user's view list
app.delete("/viewItem", async (req, res) => {
  try {
    const { e, id } = req.body;
    if (!e || !id) {
      return res.status(400).send({ error: "Email and item ID are required" });
    }
    const dbClient = await connectToDatabase();
    const collection = dbClient.db("insertDB").collection(userCollectionName);
    const filter = { email: e };
    const update = { $pull: { data: { _id: id } } };
    const result = await collection.updateOne(filter, update);

    if (result.modifiedCount > 0) {
      res.send({ success: true, message: "Item deleted successfully" });
    } else {
      res.status(404).send({ error: "Item not found" });
    }
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
