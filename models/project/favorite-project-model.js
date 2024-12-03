const mongoose = require ('mongoose');

const FavoriteProjectSchema = new mongoose.Schema({
 userId:{
        type:String
 },
 projectId:{
     type:String
 }
}, { versionKey: false });


const FavoriteProject = module.exports = mongoose.model('favoriteproject', FavoriteProjectSchema);