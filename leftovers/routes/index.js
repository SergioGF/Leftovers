var express = require('express');
var router = express.Router();

exports.index = function(req, res){
res.render('home', { title: 'ejs' });};
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('home', { title: 'Express' });
});
router.get('/image', function(req, res, next){
	console.log(req.params.imagen);
	console.log("HOLA DESDE IMAGEN");
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
module.exports = router;
