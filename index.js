const express = require('express');
const app = express();
const { MongoClient } = require('mongodb');
const port = process.env.PORT || 5000;
const cors = require('cors');
var admin = require("firebase-admin");
require('dotenv').config();


// Firebase Admin Initialize 

var serviceAccount = require("./ema-john-and-authentication-firebase-adminsdk-fx4o8-41f0790e76.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9mo66.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers.authorization?.startsWith('Bearer ')) {
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            req.decodedUserEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db('online_shop');
        const productsCollection = database.collection('products');
        const orderCollection = database.collection('orders');

        // GET Products API
        app.get('/products', async (req, res) => {
            const page = req.query.page;
            const size = parseInt(req.query.size);
            const cursor = productsCollection.find({});

            let products;
            const count = await cursor.count();
            console.log(count);
            if (page) {
                products = await cursor.skip(page * size).limit(size).toArray();
            }
            else {
                products = await cursor.toArray();
            }
            res.send({
                count,
                products
            })
        });

        // Use post to get data by keys
        app.post('/products/byKeys', async (req, res) => {
            const keys = req.body;
            const query = { key: { $in: keys } };
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        })

        // Add orders API
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.json(result)
        })

        // Laptop As Category
        app.get('/category/laptop', async (req, res) => {
            const result = await productsCollection.find({ category: 'laptop' }).toArray();
            console.log(result);
            res.send(result);
        });

        // Orders API
        app.get('/orders', verifyToken, async (req, res) => {
            const email = req.query.email;

            if (req.decodedUserEmail === email) {
                const query = { email: email }
                const cursor = orderCollection.find(query);
                const orders = await cursor.toArray();
                res.send(orders);
            }
            else {
                res.status(401).json({ message: 'User not authorized' })
            }

        })

    }
    finally {

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Ema John Server is runnning');
})


app.listen(port, () => {
    console.log('Server running on Port', port);
})