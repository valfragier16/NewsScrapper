console.log('inside server.js');

var express = require('express');
var bodyParser = require('body-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var path = require('path');

var Note = require('./models/Note.js');
var Article = require('./models/Article.js');

var request = require('request');
var cheerio = require('cheerio');


mongoose.Promise = Promise;
mongoose.connect("mongodb://heroku_xd394bdd:ncntvcs1jnacmt48iaiodvflb7@ds161016.mlab.com:61016/heroku_xd394bdd" , {
	
});

var db = mongoose.connection;

var PORT = process.env.PORT || 3000;

var app = express();

app.use(logger("dev"));
app.use(bodyParser.urlencoded({
	extended: false
}));

app.use(express.static("public"));

var exphbs = require('express-handlebars');
app.engine("handlebars", exphbs({
	defaultLayout: "main",
	partialsDir: path.join(__dirname, "/views/layouts/partials")
}));
app.set("view engine", "handlebars");

db.on("error", function(error){
	console.log("Mongoose Error: ", error);
});

db.once("open", function(){
	console.log("Mongoose connection successful.");
});

app.get("/", function(req,res){
	Article.find({"saved": false}).limit(20).exec(function(error,data){
		var hbsObject = {
			article: data
		};
		console.log(hbsObject);
		res.render("home", hbsObject);
	});
});

app.get("/saved", function(req,res){
	Article.find({"saved": true}).populate("notes").exec(function(error, articles){
		var hbsObject = {
			article: articles
		};
		res.render("saved", hbsObject);
	});
});

// app.get("/scrape", function(req,res){
// 	request("https://www.nytimes.com/section/world", function(error,response, html){
// 		var $ = cheerio.load(html);
// 		$("article").each(function(i,element){
// 			var result = {};
// 			result.title = $(this).children("h2").text();
// 			result.summary = $(this).children("p.summary").text();
// 			result.link = $(this).children("h2").children("a").attr("href");

// 			var entry = new Article(result);

// 			entry.save(function(err, doc){
// 				if(err){
// 					console.log(err);
// 				}
// 				else{
// 					console.log(doc);
// 				}
// 			});
// 		});
// 		res.send("Scrape Complete");
// 	});
// });



app.get("/scrape", function(req, res) {
	request("https://www.livescience.com/space?type=article", function(error, response, html) {
	  var $ = cheerio.load(html);
	  $("h2").each(function(i, element) {
		var result = {};
		result.title = $(this).children("h2").text();
		result.summary = $(this).children("p.summary").text();
		result.link = $(this).children("h2").children("a").attr("href");
  
		var entry = new Article(result);
  
		entry.save(function(err, doc) {
		  // Log any errors
		  if (err) {
			console.log(err);
		  }
		  // Or log the doc
		  else {
			console.log(doc);
		  }
		});
  
	  });
	  // Reload the page so that newly scraped articles will be shown on the page
	  res.sendt("Scrape Complete");
	});  
  });

app.get("/articles", function(req,res){
	Article.find({}).limit(20).exec(function(error, doc){
		if(error){
			console.log(error);
		}
		else{
			res.json(doc);
		}
	});
});

app.get("/articles/:id", function(req,res){
	Article.findOne({ "_id": req.params.id})
	.populate("note")
	.exec(function(error, doc){
		if(error){
			console.log(error);
		}
		else{
			res.json(doc);
		}
	});
});

app.post("/articles/save/:id", function(req,res){
	Article.findOneAndUpdate({ "_id": req.params.id}, {"saved": true})
	.exec(function(err, doc){
		if(err){
			console.log(err);
		}
		else{
			res.send(doc);
		}
	});
});

app.post("/articles/delete/:id", function(req,res){
	Article.findOneAndUpdate({ "_id": req.params.id}, {"saved": false, "notes":[]})
	.exec(function(err, doc){
		if(err){
			console.log(err);
		}
		else{
			res.send(doc);
		}
	});
});

app.post("notes/save/:id", function(req,res){
	var newNote = new Note({
		body: req.body.text,
		article: req.params.id
	});
	console.log(req.body)
	newNote.save(function(error, note){
		if(error){
			console.log(error);
		}
		else{
			Article.findOneAndUpdate({ "_id": req.params.id}, {$push: { "notes": note } })
			.exec(function(err){
				if(err){
					console.log(err);
					res.send(err);
				}
				else{
					res.send(note);
				}
			});
		}
	});
});

app.delete("/notes/delete/:note_id/:article", function(req,res){
	Note.findOneAndRemove({"_id": req.params.note.id}, function(err){
		if(err){
			console.log(err);
			res.send(err);
		}
		else{
			Article.findOneAndUpdate({"_id": req.params.article_id}, {$pull: {"notes": req.params.note_id}})
				.exec(function(err){
					if(err){
						console.log(err);
						res.send(err); 
					}
					else{
						res.send("Note Deleted");
					}
				});
		}
	});
});

app.listen(PORT, function(){
	console.log("\n******************************************\n" +
	"Grabbing every article headline and link\n" +
	"from the NYTimes website:" +
	"\n******************************************\n" +
		
		
	"App running on PORT: " + PORT);
});
