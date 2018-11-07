var TelegramBot = require('node-telegram-bot-api')
var firebase = require("firebase")

//token of aida_bot_test
var token = '586891143:AAGgipe8P1_JCtxODe-1NBjF_Yu9GfqPaAA'
var bot = new TelegramBot(token, {polling: true})
var timer

//initialize the firebase account
firebase.initializeApp({
  serviceAccount: "./BotBase-c2160571f9d5.json",
  databaseURL: "https://botbase-46a6a.firebaseio.com"
})

var baseRef = firebase.database().ref()
var studentsRef = baseRef.child("Students")
var courseRef = baseRef.child("Courses")
var uniqueId = 0

//The courses objects
var courses = [
    {
        courseName: "CSCI100",
        level: 1,
        time: 10,
        answer: 85,
        problem: "Please transfer 1010101 to digit"
    }, {
        courseName: "CSCI110",
        level: 2,
        time: 15,
        answer: 80,
        problem: "For example, I have 100 elements, and only 20 of them are even. How many iterations is needed for finding all odd numbers"
    },  {
        courseName: "CSCI120",
        level: 3,
        time: 17,
        answer: 4,
        problem: "How many zeros in binary of 212?"
    }, {
        courseName: "CSCI130",
        level: 3,
        time: 30,
        answer: 1995,
        problem: "When java was created?"
    }

]

//Setting the buttons for CSCI course
var options = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: 'CSCI100', callback_data: '0' }],
        [{ text: 'CSCI110', callback_data: '1' }],
        [{ text: 'CSCI120', callback_data: '2' }],
        [{ text: 'CSCI130', callback_data: '3' }]
      ]
    })
  };

  var typeCheck = ["readData", "updateData", "none"]


//checking whether this id is in the base or not
 function checkStudentId(toId, callback){
    var baseId = parseInt(toId)
    studentsRef.orderByChild("id").equalTo(baseId).once("value", function(snapshot) {
        if (snapshot.val() != null){
            snapshot.forEach(function(data) {
                callback(true,data.val().name, data.val().secondName)
            });
        } else {
            callback(false, null, null)
        }
    });
}

//this method is checking status of any parameter in Firebase 
function checkStatus(statusName, typeName, param, param2, value, value2, check, callback){
    baseRef.child(statusName).child(typeName).orderByChild(param).equalTo(value).once("value", function(snapshot) {
        if (snapshot.val() != null){
            snapshot.forEach(function(data) {
                if (check == "updateData"){
                    if (param2 == "answer" || param2 == "isPassed") {
                        courseRef.child(typeName).child(data.key).child(param2).set(value2)
                        callback(false)
                    }
                }else if (check == "readData"){
                    if (param2 == "answer"){
                        var elem = data.val().answer
                        if (value2 == elem){
                            callback(true)
                        } else {
                            callback(false)
                        }
                    } else {
                        callback(false)
                    }
                } else {
                    callback(false)
                }
            })
        } else {
            callback(true)
        }
    }, function(error){
        console.log("The read failed: " + error.code)
    })
}

//showing the buttons with courses to the user
function startAnyCourse(toId){
    bot.sendMessage(toId, "Please choose one of the courses that are provided", options)
}

//dedicated for setting the question and deadline to the course
function solveCourseProblem(index, toId){
    var course = courses[index].courseName
    var rightAnswer = courses[index].answer
    var courseTask = courses[index].problem
    
    var courseDeadline = courses[index].time
    bot.sendMessage(toId, "Please welcome to the course " + course + "\nYou are now registered\n" + "You have " + courseDeadline + " seconds" + "\nThe answer can be provided by\n/answer yourAnswer courseName")

    courseRef.child(course).push({
        id: toId,
        isRegistered: true,
        deadline: courseDeadline,
        answer: 0, 
        isPassed: false
    })    
    
    bot.sendMessage(toId, courseTask)

    timer = setTimeout(function(){
        checkAnswer(course, toId, rightAnswer)
    }, courseDeadline*1000);
}

//checking the specific answer to the specific course
function checkAnswer(course, toId, rightAnswer){
    checkStatus("Courses", course, "id", "answer", toId, parseInt(rightAnswer), typeCheck[0], function(isLogged){
        if (isLogged){
            bot.sendMessage(toId, "Well Done," + " you passed the course " + course);
            checkStatus("Courses", course, "id", "isPassed", toId, true, typeCheck[1], function(isLogged){})
        }else {
            bot.sendMessage(toId, "Failed, you didn't pass the course " + course);
        }
    })
}

function stopTimer (){
    clearTimeout(timer);
}

//user provides answer to the bot
bot.onText(/\/answer (.+) (.+)/, function (msg, match) {
    var studentId = msg.chat.id
    var answer = match[1]
    var courseName = match[2]

    checkStudentId(studentId, function(isLog, name, secondName){
        if (isLog == true){
            checkStatus("Courses", courseName, "id", "answer", studentId, parseInt(answer), typeCheck[1], function(isLogged){
                if (isLogged){
                    bot.sendMessage(studentId, "Please register to the Course")
                } else {
                    bot.sendMessage(studentId, "Thank you for the answer " + name + " " + secondName)
                    stopTimer()
                    checkAnswer(courseName, studentId, answer)

                }
            })
        } else {
            bot.sendMessage(studentId, "Please register before providing the answer.\nExample: /register yourName yourSecondName")
        }
    })
})

bot.onText(/\/start/, function (msg, match) {
    var userId = msg.chat.id
    bot.sendMessage(userId, "Welcome Student. Please type your id as: /id yourId If you do not have registered,\nplease type: /register yourName yourSecondName")
})

//register the user
bot.onText(/\/register (.+) (.+)/, function (msg, match) {
    var userId = msg.chat.id
    var name = match[1]
    var secondName = match[2]
    
    studentsRef.push({
        name: name,
        secondName: secondName,
        id: userId, 
    });
   
    bot.sendMessage(userId, "Well done, your user id is: " + userId + "\nDo not show it to anyone\n, log in: /id yourId");

})

//log in of the user
bot.onText(/\/id (.+)/, async function (msg, match) {
    var userId = msg.chat.id
    checkStudentId(userId, function(isLog, name, secondName){
        if (isLog == true){
            // uniqueId = studentId
            var message = "Welcome " + name + " " + secondName
            bot.sendMessage(userId, message);
            startAnyCourse(userId)
        } else {
            bot.sendMessage(userId, "Please register.\nExample: /register yourName yourSecondName")
        }
    })
    
})

//observer of the buttons with courses
bot.on('callback_query', function (msg) {
    var result = msg.data.split('_');
    var index = result[0]; 
    var userId = msg.from.id
    var parsedIndex = parseInt(index)
    var course = courses[parsedIndex].courseName

    checkStatus("Courses", course, "id","something", userId, 0,typeCheck[0], function(isLogged){
        if (isLogged){
            solveCourseProblem(parsedIndex, userId)
        }else{
            bot.sendMessage(userId, "You have been already registered");
        }
    })
  })
