const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.he4nr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const artAndCraftCollection = client
      .db("insertDB")
      .collection("artAndCraftCollectionData");

    //   artAndCraftCollection section starts

    app.get("/artAndCraft", async (req, res) => {
      const data = artAndCraftCollection.find();
      const results = await data.toArray();
      res.send(results);
    });

    app.get("/update/:id", async (req, res) => {
      const id = req.params.id;
      const match = {
        _id: new ObjectId(id),
      };
      const results = await artAndCraftCollection.findOne(match);
      res.send(results);
    });

    app.post("/addItem", async (req, res) => {
      const data = req.body;
      const results = await artAndCraftCollection.insertOne(data);
      res.send(results);
    });

    app.post("/update/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;

      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          tittle: data.tittle,
          photo: data.photo,
          location: data.location,
          price: data.price,
          category: data.category,
          description: data.description,
          submittedAt: data.submittedAt,
        },
      };
      const result = await artAndCraftCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    //   artAndCraftCollection section end

    const userCollection = client.db("insertDB").collection("userCollection");

    // addViewList Item
    app.put("/addList", async (req, res) => {
      const data = req.body;

      const checkDuplicate = await userCollection.findOne({
        email: data.email,
      });

      const isMatch = checkDuplicate?.data.find(
        (d) => d._id === data.data[0]._id
      );

      if (isMatch) {
        res.send({ found: "duplicateFound" });
      } else {
        const filter = { email: data.email };
        const options = { upsert: true };
        const updateDoc = {
          $setOnInsert: { email: data.email },
          $push: { data: data.data[0] },
        };
        const result = await userCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send(result);
      }
    });

    app.get("/viewList", async (req, res) => {
      const email = req.query.email;
      if (email) {
        const userCards = await userCollection.findOne({ email });
        res.send(userCards?.data || []);
      }
    });

    app.delete("/viewItem", async (req, res) => {
      const { e, id } = req.body; // e = email, id = item ID to delete

      if (!e || !id) {
        return res
          .status(400)
          .send({ error: "Email and item ID are required" });
      }

      try {
        const filter = { email: e };
        const update = { $pull: { data: { _id: id } } };
        const result = await userCollection.updateOne(filter, update);

        if (result.modifiedCount > 0) {
          res.send({ success: true, message: "Item deleted successfully" });
        } else {
          res.status(404).send({ error: "Item not found or already deleted" });
        }
      } catch (error) {
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    //   userCollection section end

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(port, () => {
  console.log(`server running on port ${port}`);
});
