const express = require('express')
const app = express()
const cors = require("cors");
require('dotenv').config()
const stripe = require("stripe")(process.env.PAYMENT_SECRET);
const jwt = require("jsonwebtoken")
const { MongoClient, ServerApiVersion, ObjectId, ClientSession } = require('mongodb');
const e = require('express');
const port = 3000


// middleware
app.use(cors());
app.use(express.json());

// verify JWT ***

const verifyJWT = (req,res,next) =>{
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({message: "invalid authorization"})
  }
  const token = authorization?.split(" ")[1]
  jwt.verify(token,process.env.token,(err,decoded)=>{
    if(err){
      return res.status(403).send({message: "Forbidden Access"})
    }
    req.decoded = decoded
    next();

  })
}


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
    const enrolledCollection = database.collection("enrolled");
    const appliedCollection = database.collection("appliedInstructor");

    // route for new users****

    app.post("/api/set-token",async(req,res) =>{
      const user = req.body;
      const token = jwt.sign(user,process.env.token,{
        expiresIn: '50d'
      });
      res.send({token})
    })

    // middleware for admin and instructors

    const verifyAdmin = async(req,res,next) =>{
      const email = req.decoded.email;
      const query = {email:email}
      const user = await usersCollection.findOne(query)
      if(user.role === "admin"){
        next()
      }
      else{
        return res.status(401).send({message: "unauthorized Access"})
      }
    }
    const verifyInstructor = async(req,res,next) =>{
      const email = req.decoded.email;
      const query = {email:email}
      const user = await usersCollection.findOne(query)
      if(user.role === "instructor"){
        next()
      }
      else{
        return res.status(401).send({message: "unauthorized Access"})
      }
    }

    app.post("/new-user",async(req,res)=>{
      const newUser = req.body;
      const result = await usersCollection.insertOne(newUser) 
      res.send(result);
    })

    app.get("/users",async(req,res) =>{
      const result = await usersCollection.find({}).toArray()
      res.send(result);
    })


    // get users by id***
    app.get("/users/:id",async(req,res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await usersCollection.findOne(query)
      res.send(result);
    })

    // get user by email

    app.get("/user/:email",verifyJWT,async(req,res) =>{
      const email = req.params.email
      const query = {email:email}
      const result = await usersCollection.findOne(query)
      res.send(result)
    })

    // delete user
    app.delete("/delete-user/:id",verifyJWT,verifyAdmin,async(req,res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })

    // update user 
    app.put("/update-user/:id",verifyJWT,verifyAdmin,async(req,res) =>{
      const id = req.params.id;
      const updateUser = req.body;
      const filter = {_id: new ObjectId(id)}
      const options = {upsert: true}
      const updateDoc = {
        $set: {
          name: updateUser.name,
          email:updateUser.email,
          address: updateUser.address,
          role: updateUser.option,
          about: updateUser.about,
          photoUrl: updateUser.photoUrl,
          skills: updateUser.skills ? updateUser.skills : null
        }
      }

      const result = await usersCollection.updateOne(filter,updateDoc,options)
      res.send(result)
    })


    // Setup classes routes here
    app.post("/new-class",verifyJWT,verifyInstructor, async (req, res) => {
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

    app.get("/classes/:email" ,verifyJWT,verifyInstructor, async(req,res) =>{
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
    app.patch("/change-status/:id" ,verifyJWT,verifyAdmin, async(req,res) =>{
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
    app.put("/update-class/:id",verifyJWT,verifyInstructor,async(req,res)=>{
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

    app.post("/add-items",verifyJWT,async(req,res) =>{
      const newItems = req.body;
      const result = await cartCollection.insertOne(newItems);
      res.send(result);
    })

    // get cart item by id

    app.get("/cart-item/:id" ,verifyJWT, async(req,res) =>{
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

    app.delete("/delete-cart-items/:id",verifyJWT,async(req,res) =>{
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


    // ************popular instructor  is not complete*************

    app.get("/popular-instructor" , async(req,res) =>{
      const pipeline= [
        {
          $group:{
            _id: "$instructorEmail",
            totalEnrolled: {$sum: "$totalEnrolled"}
          }
        }
      ]
    })

    // admin - stats

    app.get("admin-stats",verifyJWT,verifyAdmin,async(req,res)=>{
      const approvedClasses = ( (await classesCollection.find({status: 'approved'})).toArray()).length;
      const pendingClasses =  ((await classesCollection.find({status: 'pending'})).toArray()).length;
      const instructors = ((await usersCollection.find({status: 'instructor'})).toArray()).length;
      const totalClasses = (await classesCollection.find().toArray()).length
      const totalEnrolled = (await enrolledCollection.find().toArray()).length

      const result = {
        approvedClasses,
        pendingClasses,
        instructors,
        totalClasses,
        totalEnrolled
      }

      res.send(result)


    })

    // get all instructor

    app.get("/instructors",async (req,res) =>{
      const result = await usersCollection.find({role:"instructor"}).toArray()
      res.send(result)
    })

    // enrolled classes pipeline

    app.get("/enrolled-classes/:email",verifyJWT,async(req,res) =>{
      const email = req.params.email;
      const query = {userEmail: email}
      const pipeline = [
        {
          $match: query
        },
        {
          $lookup:{
            from: "classes",
            localField: "classesId",
            foreignField: "_id",
            as:"classes"
          }
        },
        {
          $unwind: "classes"
        },
        {
          $lookup: {
            from: "users",
            localField: "classes.instructorEmail",
            foreignField: "email",
            as:"instructor"
          }
        },
        {
          $project: {
            _id: 0,
            instructor: {
              $arrayElemAt: ["$instructor",0]
            },
            classes:1
          }
        }
      ]

      const result = await enrolledCollection.aggregate(pipeline).toArray()
      res.send(result);
    })

    // applied instructor

    app.post("/ass-instructor",async(req,res) =>{
      const data = req.body;
      const result = await appliedCollection.insertOne(data)
      res.send(result);
    })

    app.get("/applied-instructor/:email",async(req,res) =>{
      const email = req.params.email;
      const result = await appliedCollection.findOne({email})
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
