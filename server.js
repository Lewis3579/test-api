import express, { response } from 'express';
import cors from "cors";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import knex from 'knex';


const app = express();


app.use(express.json());
app.use(bodyParser.json());
app.use(cors())
const database = knex({
    client: "pg",
    connection: {
        host: "127.0.0.1",
        port: "5432",
        user: "postgres",
        password: "admin",
        database: "test"
    }
})
database.select('*').from('users').then(data =>{
    console.log(data);
});
var index = 0;
app.get('/', (req, res)=>{
    res.send(database.users);
})
app.post('/signin', (req, res)=>{
    return database.select("email","hash").from("login")
    .where("email","=",req.body.email)
    .then(data =>{
        const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
        console.log(isValid);
        if (isValid){
            return database.select("*").from("users")
            .where("email","=",req.body.email)
            .then(user =>{
                res.json(user[0]);
                index = user[0].id;
                console.log(index)
                return;
            })
            .catch(err => res.status(400).json(err))
        }
        else{
            res.status(400).json("Wrong password");
            return;
        }
    })
    .catch(err => res.status(400).json(err))
})

app.post('/register',(req, res)=>{
    const {email, name, password} = req.body;
    var salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password,salt);
        return database.transaction(trx =>{
            trx.insert({
                hash: hash,
                email: email
            })
            .into("login")
            .then(() =>{
                return trx('users')
                .returning('*') 
                .insert({
                    email: email,
                    name: name,
                    joined: new Date()
                })
                .then(user =>{
                    res.json(user[0])
                })
                
            })
            .then(trx.commit)
            .catch(trx.rollback)
        })
        .catch(err =>{
            res.status(400).json(err)
        })
})
app.get('/data', (req,res)=>{
    return database.select("*").from("users")
    .where("id", "=", index)
    .then(data=>{
        res.json(data[0]);
    })
})
app.listen(3000, ()=>{
    console.log("Port 3000");
});