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