const express = require('express')
const app = express()
const cors = require("cors");
const stripe = require("stripe")(process.env.PAYMENT_SECRET);
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId, ClientSession } = require('mongodb');
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
    const cartCollection = database.collection("carts");

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

    // get approved class
    app.get("/approved-classes",async(req,res) =>{
      const query = { status: "approved"}
      const result = await classesCollection.find(query).toArray()
      res.send(result);
    })

    // get single class data
    app.get("/class/:id" , async(req,res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await classesCollection.findOne(query);
      res.send(result);

    })

    // update class details (all data)
    app.put("/update-class/:id",async(req,res)=>{
      const id = req.params.id;
      const updateclass = req.body;
      const filter = {_id: new ObjectId(id)}
      const options = {upsert: true};
      const updateDoc = {
        $set:{
          name: updateclass.name,
          description: updateclass.description,
          price: updateclass.price,
          availableSeats: parseInt(updateclass.availableSeats),
          videoLink: updateclass.videoLink,
          status: "pending",

        },
      };
      const result = await classesCollection.updateOne(filter,updateDoc,options)
      res.send(result);
    })


    // ------------------------------ Cart Routes apis --------------------------

    // cart add items data

    app.post("/add-items",async(req,res) =>{
      const newItems = req.body;
      const result = await cartCollection.insertOne(newItems);
      res.send(result);
    })

    // get cart item by id

    app.get("/cart-item/:id" , async(req,res) =>{
      const id = req.params.id;
      const email = req.body;
      const query = {
        classId: id,
        userMail: email
      }
      const projection =  {classId:1}
      const result = await cartCollection.findOne(query,{projection:projection})
      res.send(result)
    })

    // get card info by user email

    app.get("/cart/:email" , async(req,res)=>{
      const email = req.params.email
      const query  = {userMail: email}
      const projection =  {classId:1}
      const carts = await cartCollection.find(query,{projection:projection})
      const classId = carts.map((cart) => new ObjectId(cart.classId))
      const query2 = {_id: {$in: classId}}
      const result = await classesCollection.find(query2).toArray()
      res.send(result);
    })

    // delete cart items

    app.delete("/delete-cart-items/:id",async(req,res) =>{
      const id = req.params.id;
      const query = {classId: id}
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })


    // ---------------------------PAYMENTS ROUTES -----------------------------


    // create payment intent

    app.post("/create-payment-intent", async (req, res) => {
      const {price} = req.body;
      const amount = parseInt(price) * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount:amount,
        currency: "usd",
        payment_method_types : ['card']
      })

      res.send({
        clientSecret: paymentIntent.client_secret,
      });


    })

    // post payment info

    app.post("/payment-info",async(req,res) =>{
      const paymentInfo = req.body;
      const classesId = paymentInfo.classesId;
      const userEmail = paymentInfo.userEmail;
      const singleClassId = req.query.classId;
      let query;
      if(singleClassId){
        query = { classesId: singleClassId , userMail: userEmail}
      } else {
        query = { classId: {$in: classesId }}
      }
    })

    // ******************************** PAYMENT ROUTES ********************************
    
    // Enrolment Route***

    app.get("/popular_classes" , async(req,res) =>{
      const result = await classesCollection.find().sort({totalEnrolled: -1}).limit(6).toArray()
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
