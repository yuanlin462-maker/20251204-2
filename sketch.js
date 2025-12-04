// Debug 開關
let showDebugOnScreen = false; // 是否顯示左上角與縮圖的 debug 訊息（預設關閉）
// 多動畫設定
let animations = {
  // 靜止狀態
  stop: { img: null, srcCandidates: ['1/stop/0.png'], frameWidth: 46, frameHeight: 47, totalFrames: 1, frameDelay: 8 },
  // 四個移動方向的動畫
  goUp: { img: null, srcCandidates: ['1/go/all.png'], frameWidth: 51, frameHeight: 51, totalFrames: 4, frameDelay: 6 },
  goDown: { img: null, srcCandidates: ['1/go/all.png'], frameWidth: 51, frameHeight: 51, totalFrames: 4, frameDelay: 6 },
  goLeft: { img: null, srcCandidates: ['1/go/all.png'], frameWidth: 51, frameHeight: 51, totalFrames: 4, frameDelay: 6 },
  goRight: { img: null, srcCandidates: ['1/go/all.png'], frameWidth: 51, frameHeight: 51, totalFrames: 4, frameDelay: 6 },
  // 特殊動作
  punch: { img: null, srcCandidates: ['1/打/all.png'], frameWidth: 60, frameHeight: 60, totalFrames: 13, frameDelay: 5 }
};
let currentAnim = 'stop';
let currentFrame = 0;
let animateSprite = true; // 是否播放動畫；若為 false，角色會停在 idleFrame
let idleFrame = 0; // 默認靜止幀

// player movement
let playerX, playerY, velocityX = 0, speed = 3;
let keyRightPressed = false, keyLeftPressed = false, keyUpPressed = false, keyDownPressed = false;
let facingLeft = false;
let movementAllowed = true; // false while playing one-shot punch
let oneShotAnimName = null;
let oneShotStartFrame = 0;

function preload() {
  // 載入所有動畫的圖檔 (每個動畫可能有多個候選來源)
  for (const key in animations) {
    const anim = animations[key];
    // if directly a src string, treat it as single candidate
    const candidates = anim.srcCandidates || (anim.src ? [anim.src] : []);
    const tryLoad = (idx) => {
      if (idx >= candidates.length) {
        console.warn(`No sprite loaded for ${key}`);
        return;
      }
      const src = candidates[idx];
      loadImage(src, (img) => {
        anim.img = img;
        console.log(`${key} sprite loaded OK from`, src);
      }, (err) => {
        console.warn(`${key} sprite load failed from`, src, err);
        tryLoad(idx + 1);
      });
    };
    tryLoad(0);
  }
}

function setup() {
  console.log('setup() called');
  createCanvas(windowWidth, windowHeight);
  // 初始化玩家位置與速度
  playerX = width / 2;
  playerY = height / 2;
  velocityX = 0;
  speed = 3;
  keyRightPressed = false;
  keyLeftPressed = false;
  // 確認動畫圖檔資訊 (如無載入會在 draw 時被跳過)
  console.log('setup finished, canvas size', width, height);
}

function draw() {
  background('#6a994e');
  
  // 決定當前 animation: one-shot > movement > stop
  if (oneShotAnimName) {
    currentAnim = oneShotAnimName;
  } else if (keyUpPressed) {
    currentAnim = 'goUp';
  } else if (keyDownPressed) {
    currentAnim = 'goDown';
  } else if (keyLeftPressed) {
    currentAnim = 'goLeft';
    facingLeft = true;
  } else if (keyRightPressed) {
    currentAnim = 'goRight';
    facingLeft = false;
  } else {
    currentAnim = 'stop';
  }
  const anim = animations[currentAnim];
  if (!anim || !anim.img) {
    // 如果資源沒載入就畫一個 placeholder（方便確認 playerX/Y 是否正確）
    fill(255, 0, 255);
    noStroke();
    ellipse(playerX, playerY, 32, 32);
    return;
  }

  // --- 動畫邏輯 ---
  const cols = max(1, floor(anim.img.width / anim.frameWidth));
  const rows = max(1, floor(anim.img.height / anim.frameHeight));
  const actualFrames = cols * rows;
  const framesCount = min(anim.totalFrames, actualFrames);
  
  if (oneShotAnimName === currentAnim) {
    // one-shot animation plays from its start until finished then stops
    const elapsed = frameCount - oneShotStartFrame; // 經過的幀數
    const frameIndex = floor(elapsed / anim.frameDelay);
    if (frameIndex >= framesCount) {
      // finished
      oneShotAnimName = null;
      movementAllowed = true;
      currentAnim = 'stop';
      currentFrame = 0;
    } else {
      currentFrame = frameIndex;
    }
  } else if (animateSprite) {
    currentFrame = floor(frameCount / anim.frameDelay) % framesCount;
  } else {
    currentFrame = idleFrame; // 站在原地（靜止）
  }
  
  // 計算要繪製的精靈位置
  let sx = (currentFrame % cols) * anim.frameWidth;
  let sy = floor(currentFrame / cols) * anim.frameHeight;
  
  // --- 玩家移動邏輯 ---
  let velocityY = 0;
  if (!movementAllowed) {
    // during one-shot animation, freeze horizontal/vertical movement
    velocityX = 0;
    velocityY = 0;
  } else if (keyRightPressed) {
    velocityX = speed;
    facingLeft = false;
  } else if (keyLeftPressed) {
    velocityX = -speed;
    facingLeft = true;
  } else {
    velocityX = 0;
  }
  
  if (movementAllowed) {
      if (keyUpPressed) {
        velocityY = -speed;
      } else if (keyDownPressed) {
        velocityY = speed;
      }
  }

  playerX += velocityX;
  playerY += velocityY;
  
  playerX = constrain(playerX, anim.frameWidth / 2, width - anim.frameWidth / 2);
  playerY = constrain(playerY, anim.frameHeight / 2, height - anim.frameHeight / 2);
  // 在畫布 playerX/playerY 繪製動畫
  imageMode(CENTER);
  push();
  translate(playerX, playerY);
  if (facingLeft) scale(-1, 1);
  image(anim.img, 0, 0, anim.frameWidth, anim.frameHeight, sx, sy, anim.frameWidth, anim.frameHeight);
  pop();

  // --- Debug 資訊 ---
  if (showDebugOnScreen) {
    // 顯示目前狀態小提示（方便測試）
    fill(255);
    noStroke();
    textSize(14);
    text(`Use arrows to move; SPACE: punch; D: debug`, 10, 20);
    text(`Current: ${currentAnim}  frame:${currentFrame}`, 10, 52);

    // Debug: 顯示目前的幀與裁切座標
    if (anim && anim.img) {
      const debugSx = sx;
      const debugSy = sy;
      // 顯示一個縮小的整張 sprite sheet，在右下角
      const thumbsScale = 0.18; // 縮放比例，可調整
      const thumbW = anim.img.width * thumbsScale;
      const thumbH = anim.img.height * thumbsScale;
      const thumbX = width - thumbW - 10;
      const thumbY = height - thumbH - 10;
      imageMode(CORNER);
      image(anim.img, thumbX, thumbY, thumbW, thumbH);
      // 以紅框畫出當前裁切區（先把 sx,sy 轉成縮放座標）
      noFill();
      stroke(255, 0, 0);
      strokeWeight(2);
      const rectX = thumbX + debugSx * thumbsScale;
      const rectY = thumbY + debugSy * thumbsScale;
      const rectW = anim.frameWidth * thumbsScale;
      const rectH = anim.frameHeight * thumbsScale;
      rect(rectX, rectY, rectW, rectH);
      // 恢復 imageMode
      text(`frame ${currentFrame} sx:${debugSx}, sy:${debugSy} cols:${cols}`, 10, 36);
      imageMode(CENTER);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function keyPressed() {
  if (key === ' ') {
    // start punch (one-shot) animation
    if (!oneShotAnimName) {
      oneShotAnimName = 'punch';
      oneShotStartFrame = frameCount;
      movementAllowed = false;
      console.log('Started punch animation');
    }
  }
  // 'i' 設置 idle 幀，按數字鍵 0~9 可以快速切換（若有 13 張幀，按 0..9 代表對應數字；按 'a' 或 'A' 可以設為 10，'b' 11，'c' 12，視需要）
  if (key >= '0' && key <= '9') {
    let n = int(key);
    const currentAnimFrames = animations[currentAnim] ? animations[currentAnim].totalFrames : 0;
    if (n < currentAnimFrames) {
      idleFrame = n;
      console.log('Idle frame set to', idleFrame);
    }
  }
  if (key === 'd' || key === 'D') {
    showDebugOnScreen = !showDebugOnScreen;
    console.log('Show on-screen debug:', showDebugOnScreen);
  }
  // 左右鍵按下
  if (keyCode === RIGHT_ARROW) {
    keyRightPressed = true;
  }
  if (keyCode === LEFT_ARROW) {
    keyLeftPressed = true;
  }
  // 上下鍵按下
  if (keyCode === UP_ARROW) {
    keyUpPressed = true;
  }
  if (keyCode === DOWN_ARROW) {
    keyDownPressed = true;
  }
  // prevent default browser behavior
  return false;
}

function keyReleased() {
  if (keyCode === RIGHT_ARROW) {
    keyRightPressed = false;
  }
  if (keyCode === LEFT_ARROW) {
    keyLeftPressed = false;
  }
  // 上下鍵放開
  if (keyCode === UP_ARROW) {
    keyUpPressed = false;
  }
  if (keyCode === DOWN_ARROW) {
    keyDownPressed = false;
  }
  return false;
}
