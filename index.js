const express = require('express')
const app = express()
const cors = require("cors");
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = 3000


// middleware
app.use(cors());
app.use(express.json());

// pass = g7ULokrOYMZzIBsV
// uswer = learnify


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.quaequt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    // create database and collection
    const database = client.db("learnifyDB");
    const usersCollection = database.collection("users");
    const classesCollection = database.collection("classes");

    // Setup classes routes here
    app.post("/new-class", async (req, res) => {
      const newClasses = req.body;
      const result = await classesCollection.insertOne(newClasses);
      res.send(result);
    });

    // get classes data
    app.get("/classes" , async(req,res) =>{
      const result = await classesCollection.find().toArray()
      res.send(result)
    })

    // get classes by instructor email

    app.get("/classes/:email" , async(req,res) =>{
      const email = req.params.email;
      const query = {instructorEmail: email}
      const result = await classesCollection.find(query).toArray()
      res.send(result);
    })

    // manage classes
    app.get("/class-manage",async(req,res) =>{
      const result = await classesCollection.find().toArray()
      res.send(result);
    })

    // update classes status and reason
    app.patch("/change-status/:id" , async(req,res) =>{
      const id = req.params.id;
      const status = req.body.status;
      const reason = req.body.reason;
      const filter = {_id: new ObjectId(id)}
      const options = {upsert: true};
      const updateDoc = {
        $set:{
          status: status,
          reason: reason,

        },
      };
      const result = await classesCollection.updateOne(filter,updateDoc,options);
      res.send(result);
    })

    // Start the Express server
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

run().catch(console.error);
