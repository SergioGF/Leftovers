var express = require('express');
var router = express.Router();
var database = require('../models/database');
var ingredientes = require('../models/ingredientes');
var vision = require('@google-cloud/vision');
var fs = require('fs');
var ba64 = require("ba64");
const translate = require('google-translate-api');
var sleep = require('system-sleep');
GOOGLE_APPLICATION_CREDENTIALS="./Leftovers.json";

//Variables
var someIngredients = [];
var obj = [];
//puestas solo para la prueba del filtro
var filtrarPor = [];


exports.index = function(req, res){
res.render('home', { title: 'ejs' });};
/* GET home page. */
router.get('/', function(req, res, next) {
res.render('home', { title: 'ejs' });
});
router.get('/principal/:modo?', function(req, res, next) {
	var modo = req.query.modo;	
	console.log(modo);
	res.render('principal', { opcion: modo });

	//var modo = req.query.modo;
	/*
	Si modo = 1, busca con filtro -> principal pesta�a recetas
	busca recetas con filtro....
	if(modo == 1){
	
	}
	Si modo = 2, buscar sin filtro -> principal pesta�a a�adir filtros para busqueda
	busqueda de recetas al azar...
	else if(modo == 2){
	
	}
	*/
});
router.get('/principal', function(req, res, next) {
	res.render('principal', { opcion: 2 });
});

//obtener recetas - ingredientes: uso --> filtrarPor = ['Sal', 'Huevo']; getRecipes(filtrarPor);
function getAllIngredients(callback){
	var sql = 'SELECT I.nombre, I.idreceta, I.cantidad, R.titulo, R.npersonas, R.tiempo, R.dificultad, R.instrucciones, R.multimedia FROM ingredientes I, recetas R where I.idreceta = R.id';
	database.connection.query(sql, function(error, result)
	{
	if(error)
		throw error;
	else{
		callback(null, result);
	}
	});
}

router.get('/receta/:recipe', function(req, res, next) {

	id_receta = req.query.id;
	getAllIngredients(function(error, obtainedBd){
		ingredientes = (obtainedBd.filter(ingr => ingr.idreceta == id_receta));
		ingredientes_receta = [];
		una_receta = {};
		for (var index = 0; index < ingredientes.length; index++){
			elem = ingredientes[index];
			if(index == 0){
				una_receta = {'id':elem.idreceta, 'titulo':elem.titulo, 'npersonas':elem.npersonas, 'tiempo':elem.tiempo, 'dificultad':elem.dificultad, 'instrucciones':elem.instrucciones, 'multimedia': elem.multimedia};
			}
			ingrediente_cantidad = JSON.stringify({'nombre': elem.nombre, 'cantidad':elem.cantidad});
			ingredientes_receta = ingredientes_receta.concat([ingrediente_cantidad]);
			if(index == ingredientes.length-1){
				una_receta['ingredientes'] = ingredientes_receta;
			}
		}
		res.send(una_receta);
	});
});

router.get('/receta', function(req, res, next) {
	res.render('receta', { nombre: "" });
});
router.get('/principalFiltros', function(req, res, next) {
	res.render('principalFiltros', { nombre: "" });
});

router.get('/image', function(req, res, next) {
	ba64.writeImageSync("myimage", req.query.imagen);
	// Creates a client
	const client = new vision.ImageAnnotatorClient();
	
	// Performs label detection on the image file - req.query.imagen contains image
		client
		.labelDetection('./myimage.jpeg')
		.then(results => {
		const labels = results[0].labelAnnotations;

		console.log('Labels:');
		labels.forEach(label => console.log(''+ label.description + ' ' + label.score + ''));
		for (var i = 0, len = labels.length; i < len; i++) {
			translate(labels[i].description, {to: 'es'}).then(resul => {
				console.log(resul.text);
				someIngredients.push(resul.text);
			}).catch(err => {
				console.error(err);
			});
		}
		 })
		.catch(err => {
			console.error('ERROR:', err);
		});
		setTimeout(sendToFront, 3000,res);
});

router.get('/ingr', function(req, res, next) {
  ingredientes.getLista(function(error, data){
		obj = data;
		console.log(data);
  });

  /*
  database.connection.query('SELECT nombre FROM ingredientes', function(error, results){
	if(error){
		console.log(error.code);
	}	
	else{
		obj = results;
	}
});
  */
  setTimeout(sendToFrontIngr, 2500,res);
});

router.get('/ingrInic', function(req, res, next) {
  ingredientes.getLista(function(error, data){
		obj = data;
		console.log(data);
  });
});
function sendToFront(res){
	res.send(someIngredients);
	someIngredients = [];
}

function sendToFrontIngr(res){
	res.send(obj);
	obj = {};
}


function filterIngrs(recetas) {
    return function(element) {
        for (var index = 0; index < recetas.length; index++) {  
		if (element.idreceta == recetas[index]) {  
		    return true;  
		}  
	}   
    	return false;
	}
}

router.get('/recipes', function(req, res, next){
	//El ingrediente est� en req.query.ing pero en minusculas entero.
	filtrarPor = req.query.ing;
	getAllIngredients(function(error, obtainedBd){
		//se incorpora un elemento con el nombre del ingrediente en minusculas para filtrar con el array, solo se usa en esta funcion
		for (var index = 0; index < obtainedBd.length; index++){
			elem = obtainedBd[index];
			elem['nombremin'] = elem.nombre.toLowerCase();
			obtainedBd[index] = elem;
		}
		
		recetas = [];
		for (var index = 0; index < filtrarPor.length; index++){
			//se obtienen las recetas que tienen ese ingrediente
			recetas = (obtainedBd.filter(ingr => ingr.nombremin == filtrarPor[index].toLowerCase())).map(a => a.idreceta);
			console.log(recetas);
			//se actualiza la lista de ingredientes para que solo contenga las apariciones de ingredientes de esas recetas			
			obtainedBd = obtainedBd.filter(filterIngrs(recetas));
			//console.log(obtainedBd);
		}
		console.log(recetas);
		
		indexRecetasAlgunoMas = [];
		recetasAlgunoMas = [];
		for (var index = 0; index < obtainedBd.length; index++){
			elem = obtainedBd[index];
			if(filtrarPor.indexOf(elem.nombremin) < 0){
				if(indexRecetasAlgunoMas.indexOf(elem.idreceta)<0){
					indexRecetasAlgunoMas.push(elem.idreceta);
				}			
			}
		}

		//console.log(indexRecetasAlgunoMas);

		ingredientesPorReceta = {};
		for (var index = 0; index < obtainedBd.length; index++){
			elem = obtainedBd[index];
			if(ingredientesPorReceta.hasOwnProperty(String(elem.idreceta))){
				ingredientes_receta = ingredientesPorReceta[String(elem.idreceta)];
				ingrediente_cantidad = JSON.stringify({'nombre': elem.nombre, 'cantidad':elem.cantidad});
				newstr = ingredientes_receta.concat([ingrediente_cantidad]);
				ingredientesPorReceta[String(elem.idreceta)] = newstr;
			}
			else{
				ingrediente_cantidad = JSON.stringify({'nombre': elem.nombre, 'cantidad':elem.cantidad});
				ingredientesPorReceta[String(elem.idreceta)] = [ingrediente_cantidad];
			}
		}

		recetasAlgunoMas = [];
		for (var index = 0; index < indexRecetasAlgunoMas.length; index++){
			for (var j = 0; j < obtainedBd.length; j++){
				elem = obtainedBd[j];
				if (elem.idreceta == indexRecetasAlgunoMas[index]){
					insert = {'id':elem.idreceta, 'ingredientes':ingredientesPorReceta[String(elem.idreceta)], 'titulo':elem.titulo, 'npersonas':elem.npersonas, 'tiempo':elem.tiempo, 'dificultad':elem.dificultad, 'instrucciones':elem.instrucciones, 'multimedia': elem.multimedia};
					recetasAlgunoMas.push(insert);
					break;
				}
			}
		}
		
		//console.log(recetasAlgunoMas);

		recetasSoloEsosIngredientes = [];
		inserted = [];
		//console.log(todasLasRecetas);

		for(var index = 0; index < obtainedBd.length; index++){
			elem = obtainedBd[index];			
			if(indexRecetasAlgunoMas.indexOf(elem.idreceta) < 0 && (inserted.indexOf(elem.idreceta)<0)){
				inserted.push(elem.idreceta);
				insert = {'id':elem.idreceta, 'ingredientes':ingredientesPorReceta[String(elem.idreceta)], 'titulo':elem.titulo, 'npersonas':elem.npersonas, 'tiempo':elem.tiempo, 'dificultad':elem.dificultad, 'instrucciones':elem.instrucciones, 'multimedia': elem.multimedia};
				recetasSoloEsosIngredientes.push(insert);
			}
		}
		//console.log(recetasSoloEsosIngredientes);
		//console.log(recetasAlgunoMas.id);

	res.send({recetasSoloEsosIngredientes, recetasAlgunoMas});
  	});
});

router.get('/recipesWithout', function(req, res, next){
	getAllIngredients(function(error, obtainedBd){
		//No se recibe nada.
		recetas = [];

		ingredientesPorReceta = {};
		for (var index = 0; index < obtainedBd.length; index++){
			elem = obtainedBd[index];
			if(ingredientesPorReceta.hasOwnProperty(String(elem.idreceta))){
				ingredientes_receta = ingredientesPorReceta[String(elem.idreceta)];
				ingrediente_cantidad = JSON.stringify({'nombre': elem.nombre, 'cantidad':elem.cantidad});
				newstr = ingredientes_receta.concat([ingrediente_cantidad]);
				ingredientesPorReceta[String(elem.idreceta)] = newstr;
			}
			else{
				ingrediente_cantidad = JSON.stringify({'nombre': elem.nombre, 'cantidad':elem.cantidad});
				ingredientesPorReceta[String(elem.idreceta)] = [ingrediente_cantidad];
			}
		}
	
		inserted = [];

		for(var index = 0; index < obtainedBd.length; index++){
			elem = obtainedBd[index];			
			if(inserted.indexOf(elem.idreceta)<0){
				inserted.push(elem.idreceta);
				insert = {'id':elem.idreceta, 'ingredientes':ingredientesPorReceta[String(elem.idreceta)], 'titulo':elem.titulo, 'npersonas':elem.npersonas, 'tiempo':elem.tiempo, 'dificultad':elem.dificultad, 'instrucciones':elem.instrucciones, 'multimedia': elem.multimedia};
				recetas.push(insert);
			}
		}
		res.send(recetas);
  	});	
	
});

router.get('/recipesWithFilters', function(req, res, next){
	console.log(req.query.filtros);
	filtros = req.query.filtros; //Est�n como: Duraci�n,Tiempo,nPersonas, para obtener cada uno haces filtro.split(',')[0], igual con [1] e igual con [2]
								 //El tiempo est� en minutos y he visto que en la BD est� en horas y minutos, quiz� eso te de algun problema.
	filtros_list = filtros.split(',');
	console.log(filtros_list);
	dificultad = filtros_list[0];
	tiempo = filtros_list[1];
	npersonas = filtros_list[2];
	
	getAllIngredients(function(error, obtainedBd){
		recetas = [];

		recetas = (obtainedBd.filter(ingr => aMinutos(ingr.tiempo) < tiempo));
		recetas = (recetas.filter(ingr => ingr.dificultad == dificultad));
		recetas = (recetas.filter(ingr => ingr.npersonas >= npersonas));
		recetas = recetas.map(a => a.idreceta);
		
		indexRecetas = [];
		for (var index = 0; index < recetas.length; index++){
			if(indexRecetas.indexOf(recetas[index])<0){
				indexRecetas.push(recetas[index]);
			}			
		}


		ingredientesPorReceta = {};
		for (var index = 0; index < obtainedBd.length; index++){
			elem = obtainedBd[index];
			if(ingredientesPorReceta.hasOwnProperty(String(elem.idreceta))){
				ingredientes_receta = ingredientesPorReceta[String(elem.idreceta)];
				ingrediente_cantidad = JSON.stringify({'nombre': elem.nombre, 'cantidad':elem.cantidad});
				newstr = ingredientes_receta.concat([ingrediente_cantidad]);
				ingredientesPorReceta[String(elem.idreceta)] = newstr;
			}
			else{
				ingrediente_cantidad = JSON.stringify({'nombre': elem.nombre, 'cantidad':elem.cantidad});
				ingredientesPorReceta[String(elem.idreceta)] = [ingrediente_cantidad];
			}
		}

		recetasCompletas = [];

		for (var index = 0; index < indexRecetas.length; index++){
			for (var j = 0; j < obtainedBd.length; j++){
				elem = obtainedBd[j];
				if (elem.idreceta == indexRecetas[index]){
					insert = {'id':elem.idreceta, 'ingredientes':ingredientesPorReceta[String(elem.idreceta)], 'titulo':elem.titulo, 'npersonas':elem.npersonas, 'tiempo':elem.tiempo, 'dificultad':elem.dificultad, 'instrucciones':elem.instrucciones, 'multimedia': elem.multimedia};
					recetasCompletas.push(insert);
					break;
				}
			}
		}
	console.log(recetasCompletas);
	res.send({recetasCompletas});
  	});
	//Devolver las recetas como en los otros
});

function aMinutos(str){
	str_splitted = str.split(' ');
	if (str_splitted.length == 2){
		return parseInt(str_splitted[0]);
	}
	else{
		return parseInt(str_splitted[0])*60+parseInt(str_splitted[2]);
	}
}


module.exports = router;

  	


