const VFolder = require("../../models/vfolder/vfolder-model")


exports.getVFolders = async (req, res) => {

  try{
    const {companyId} = req.params
    const vFolders = await VFolder.find({companyId})

    return res.json({success: true, result: vFolders})

  }
  catch(e){
    console.log(e)
    return res.json({success: false, result: ""})
  }

}

exports.renameVFolder = async (req, res) => {

  try{
    const {id, folderName} = req.body

    const isFolderExists = await VFolder.findOne({name: folderName})
    if(isFolderExists){
      return res.json({success: false,  message: "Folder name already exists!"})  
    }
    const vFolder = await VFolder.findOneAndUpdate({_id: id}, {name: folderName})
 
    return res.json({success: true, result: vFolder,  message: "Folder renamed successfully!"})

  }
  catch(e){
    console.log(e)
    return res.json({success: false, message: "Failed renaming Folder!"})
  }

}