
const { LocationHistory } = require('../../models/location-history/location-history');
const User = require('../../models/user/user-model');
const mongoose = require('mongoose')

const {activeClients, uwsApp} = require('../../index')



exports.getAllLocationHistory = async (req,res)=>{
  try{
    const {userId, date, companyId} = req.body

    console.log(userId, companyId, date)

    const timeZoneOffset = 330

    let startDate = new Date(new Date(date).setUTCHours(0,0,0,0))
    let endDate = new Date(new Date(date).setUTCHours(23,59,59,999))

    startDate.setMinutes(startDate.getMinutes() - timeZoneOffset);
    endDate.setMinutes(endDate.getMinutes() - timeZoneOffset);

    console.log(startDate , endDate)
    const locationHistory = await LocationHistory.aggregate([
      { 
        $match: { 
          companyId: new mongoose.Types.ObjectId(companyId), 
          userId: new mongoose.Types.ObjectId(userId),
          "locationHistory.timestamp": { $gte: startDate, $lte: endDate } 
        }
      },
      {
        $project: {
          locationHistory: {
            $filter: {
              input: "$locationHistory",
              as: "location",
              cond: {
                $and: [
                  { $gte: ["$$location.timestamp", startDate] },
                  { $lte: ["$$location.timestamp", endDate] }
                ]
              }
            }
          }
        }
      }
    ]);



    console.log(locationHistory, "Location")
    
    return res.json({success: true, data: locationHistory[0] })
  }
  catch(e){
    console.log(e)
    return res.json({success: false, message: "", err: e, data:[]})
  }
}

exports.getLocationHistoryByUserId = async (req,res)=>{
  try{
    const {userId} = req.params
    const locationHistory = await LocationHistory.find({userId})
    
      return res.json({success: true, data: locationHistory })
  }
  catch(e){
    return res.json({success: false, message: "", err: e, data:[]})
  }
}

exports.addLocationHistory = async (req,res)=>{
  try{
    const {userId, companyId, locationHistory} = req.body
    await User.updateOne({_id: userId},{
      currentLocation: locationHistory
    })
    const isLocationHistoryExists = await LocationHistory.findOne({userId, companyId})
    if(isLocationHistoryExists){
      await LocationHistory.updateOne({_id: isLocationHistoryExists._id}, {
        $push: {locationHistory: locationHistory}
      })
    }
    else{
      await LocationHistory.create({
        userId: userId,
        companyId: companyId,
        locationHistory: [locationHistory]
      })
    }
    console.log("activeClients", activeClients)
    const companyClients = activeClients.get(companyId);
    if (companyClients) {
      companyClients.forEach((client) => {
      if (client) {
        console.log(client)
        console.log("event sending to client ")
        client.send(JSON.stringify({
              event: "update-location",
              userId: userId,
              companyId: companyId,
              status: "LIVE"
            }));
      }})}
    
      
      return res.json({success: true, message: "Successfully Added/Updated Location History"})
  }
  catch(e){
    return res.json({success: false, message: "Error Adding/Updarting Location History", err: e})
  }
}

exports.deleteLocationHistory = async (req,res) =>{
  try{
      const {userId} = req.params
      await LocationHistory.deleteMany({userId})
      return res.json({success: true, })
  }
  catch(e){
    return res.json({success: false, message: "", err: e})
  }
}
