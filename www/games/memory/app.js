let gameSeq = [];
let userSeq = [];
let h2 = document.querySelector('.upper');
let started = false;
let level = 0;
let h3 = document.querySelector(".watch");
let lower = document.querySelector(".lower");

let btns = ["red", "yellow", "green", "purple", "a", "b", "c", "d", "e","f", "g", "h","i","j", "k", "l"];







document.addEventListener("keypress" ,function() {
    if(started == false){
        console.log("game is started");
       started = true;

       levelUp();
        
    } 
})

document.addEventListener("touchstart" ,function() {
    if(started == false){
        console.log("game is started");
       started = true;

       levelUp();
        
    } 
})

function checkAns(idx){
        
        
        if(userSeq[idx] === gameSeq[idx]){
            if(userSeq.length == gameSeq.length){
                setTimeout(levelUp, 1000);
            }
        } else{
            
            h2.innerHTML = `<span class = "over">GAME OVER!</span>`
            h3.innerText = `Max Score : ${level}`;
            lower.innerHTML = `Press any key to restart`;

            reset();
        }
    
}

 function btnFlash(btn){
    btn.classList.add("flash");
    setTimeout(function(){
        btn.classList.remove("flash");
    }, 250)
}

 function userFlash(btn){
    btn.classList.add("userflash");
    setTimeout(function(){
        btn.classList.remove("userflash");
    }, 250)
    
}

let allBtn = document.querySelectorAll('.btn');
   for(btn of allBtn){
      btn.addEventListener("click", btnPress);
   }

function btnPress(){
    let btn = this;
    userFlash(btn);

    let userCol = btn.getAttribute("id");
   

    userSeq.push(userCol);

    checkAns(userSeq.length -1);

    
}



function levelUp() {
    level++;
    userSeq = [];

    h2.innerText = `Level : ${level}`;
    h3.innerText = `Watch Carefully!! ....Repeat the sequence!`
    lower.innerText = ``;
    
    let randIdx = Math.floor(Math.random()*16);
    let randCol = btns[randIdx];

    let randBtn = document.querySelector(`.${randCol}`); 

          gameSeq.push(randCol);

          

    //random btn choose
    btnFlash(randBtn);
}

function reset(){
    gameSeq = [];
    started = false;
    userSeq = [];
    level = 0;
}

