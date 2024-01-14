import express, { response } from 'express';
import cors from "cors";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import knex from 'knex';
import * as fs from 'fs';
import multer from 'multer';
import * as jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(cors());

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
var current = [];
var currents = [];
var mangaCover, mangaTitle, mangaID, chapterID, getMangaName, chapterName;
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
        }
        else{
            res.status(400).json("Wrong password");
            return;
        }
    })
})

app.post('/register',(req, res)=>{
    const {email, name, password} = req.body;
    var salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password,salt);
        return database.transaction(trx =>{
            trx
            .insert({
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
    .catch(err => res.status(400).json(err))
})
app.get('/frontpage',(req,res)=>{
    return database.select("*").from("mangas")
    .then(data=>{
        res.json(data);
        console.log(data);
    })
    .catch(err => res.status(400).json(err))
})
app.get('/favourite',(req,res)=>{
    return database.select("*").from("mangas")
    .join('favourites', function(){
        this.on('mangas.manga_id','=','favourites.manga_id')
    })
    .where('favourites.user_id','=',index)
    .then(data=>{
        res.json(data);
        console.log(data);
    })
    .catch(err => res.status(400).json(err))
})
app.post('/mangatitle',(req,res)=>{
    const {manga_id} = req.body;
    mangaID = manga_id;
    console.log(mangaID);
    database.select('title').from('mangas').where('manga_id','=',manga_id).then(d =>{
        getMangaName = d[0].title;
        console.log(getMangaName);
    }
    )
    return database.select('mangas.manga_id','mangas.title','chapters.chapter_id','chapters.chapter')
    .from('mangas').join('chapters',function(){
        this.on('chapters.manga_id','=','mangas.manga_id')
    })
    .where('chapters.manga_id','=',manga_id)
    .then(data=>{
        res.json(data);
        current = data;
        
        console.log(current);

    })
    .catch(err => res.status(400).json(err))
    
})
app.post('/add',(req,res)=>{
    const {manga_id} = req.body;
    return database.transaction(trx =>{
        trx
        .insert({
            user_id: index,
            manga_id: manga_id
        })
        .into('favourites')
        .then(trx.commit)
        .catch(trx.rollback)
    })
    .catch(err => res.status(400).json(err))
    
})
app.post('/delete',(req,res)=>{
    const {manga_id} = req.body;
    return database('favourites')
    .where('manga_id','=',manga_id)
    .andWhere('user_id','=',index)
    .del()
    .then(console.log(manga_id, index))
    .catch(err => res.status(400).json(err));
})
app.get('/deletemanga',(req,res)=>{
    const manga_id1 = mangaID;
    
    return database('mangas')
    .where('manga_id','=',manga_id1)
    .del()
    .then(console.log(manga_id1));
})
app.get('/deletechapter',(req,res)=>{
    const chapter_id1 = chapterID;
    
    return database('chapters')
    .where('chapter_id','=',chapter_id1)
    .del()
    .then(console.log(chapter_id1));
})
app.get('/content', (req,res)=>{
    return res.json(current)
})
const imagesDir = 'D:/Practice/HTML JavaScript CSS/test/public/Manga/';
var imageDir;
app.get('/content/:id',(req,res)=>{
    const chapter_id = req.params.id;
    database.select('chapter').from('chapters').where('chapter_id','=',chapter_id).then(da=>{
        chapterName = da[0].chapter;
        console.log(chapterName);
        imageDir = imagesDir + getMangaName + '/' + chapterName;
    })
    chapterID = chapter_id;
    console.log(chapterID);
    return database.select('image.pic','chapters.chapter','mangas.title')
    .from('image').join('chapters', function(){
        this.on('image.chapter_id','=','chapters.chapter_id')
    })
    .join('mangas', function(){
        this.on('mangas.manga_id','=','chapters.manga_id')
    })
    .where('image.chapter_id','=',chapter_id)
    .then(data=>{
        res.json(data)
        currents = data;
        console.log(currents)
    })
    .catch(err => res.status(400).json(err))
})

app.post('/uploadmangatitle',(req,res)=>{
    const {title} = req.body;
    const folder = 'D:/Practice/HTML JavaScript CSS/test/public/Manga/'+title;
    console.log(folder);
    mangaTitle = title;
    fs.mkdirSync(folder);
    
})
const Coverdir = 'D:/Practice/HTML JavaScript CSS/test/public/Manga/MangaCover';
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, Coverdir)
    },
    filename: function(req, file, cb) {
      cb(null, `${file.originalname}`)
    }
  })
const coverUpload = multer({storage: storage});

app.post('/uploadmanga',coverUpload.single("myfile"),(req,res)=>{
    mangaCover ='Manga/MangaCover/' + req.file.originalname;
    console.log(mangaTitle,mangaCover);
    return database.transaction(trx =>{
        trx
        .insert({
            title: mangaTitle,
            cover: mangaCover
        })
        .into('mangas')
        .then(trx.commit)
        .catch(trx.rollback)
    })
    .catch(err => res.status(400).json(err))
})
app.post('/uploadchapter',(req,res)=>{
    const {chapter} = req.body;
    var mangaName;
    database.select('title').from('mangas').where('manga_id','=',mangaID).then(data=>{
        mangaName = (data[0].title);
        const folder = 'D:/Practice/HTML JavaScript CSS/test/public/Manga/'+mangaName+'/'+chapter;
        console.log(folder);
        database.transaction(trx=>{
            trx
            .insert({
                chapter: chapter,
                manga_id: mangaID
            })
            .into('chapters')
            .then(trx.commit)
            .catch(trx.rollback)
        })
        fs.mkdirSync(folder);
    });
})
const storage2 = multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, imageDir)
    },
    filename: function(req, file, cb) {
      cb(null, `${file.originalname}`)
    }
  })
const imageUpload = multer({storage: storage2});
app.post('/uploadimage',imageUpload.array('myimage',100),(req,res)=>{
    console.log(imageDir);
    console.log(chapterID);
    for(let i = 0; i<req.files.length;i++){
        database.transaction(trx =>{
            trx
            .insert({
                pic: req.files.at(i).originalname,
                chapter_id: chapterID
            })
            .into('image')
            .then(trx.commit)
            .catch(trx.rollback)
        })
    }
})

app.listen(3000, ()=>{
    console.log("Port 3000");
});