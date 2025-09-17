let pushupCount = 0;
let squatCount = 0;
let detector = null;
let flag_pushup = 'up';
let flag_squat = 'up';

let pushupState = {
  max_angle: 0,
  min_angle: 180,
  farthest_distance: null,
  closest_distance: null
};

let squatState = {
  max_angle: 0,
  min_angle: 180,
  farthest_distance: null,
  closest_distance: null
};

const video = document.getElementById('video');
const videoInput = document.getElementById('videoInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const openCameraBtn = document.getElementById('openCameraBtn');
const resetCountsBtn = document.getElementById('resetCountsBtn');
const statusDiv = document.getElementById('status');
const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');

const elbowAngleDisplay = document.getElementById('elbowAngleDisplay');
const kneeAngleDisplay = document.getElementById('kneeAngleDisplay');
const shoulderKneeDisplay = document.getElementById('shoulderKneeDisplay');
const selectedSideDisplay = document.getElementById('selectedSide');
const pushupThresholdInput = document.getElementById('pushupThresholdInput');
const squatThresholdInput = document.getElementById('squatThresholdInput');
const distanceThresholdInput = document.getElementById('distanceThresholdInput');

document.addEventListener('DOMContentLoaded', () => {
  setupDetector();
});

selectFileBtn.addEventListener('click', () => videoInput.click());
videoInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const videoURL = URL.createObjectURL(file);
    video.src = videoURL;
    video.loop = true;
    video.load();
  }
});

openCameraBtn.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.load();
  } catch (err) {
    statusDiv.innerText = 'Lỗi truy cập camera: ' + err.message;
  }
});

resetCountsBtn.addEventListener('click', () => {
  pushupCount = 0;
  squatCount = 0;
  document.getElementById('pushupCount').innerText = pushupCount;
  document.getElementById('squatCount').innerText = squatCount;
  flag_pushup = 'up';
  flag_squat = 'up';
  pushupState.max_angle = 0;
  pushupState.min_angle = 180;
  pushupState.farthest_distance = null;
  pushupState.closest_distance = null;
  squatState.max_angle = 0;
  squatState.min_angle = 180;
  squatState.farthest_distance = null;
  squatState.closest_distance = null;
  updateDebugUI();
});

async function setupDetector() {
  if (detector) return;
  try {
    statusDiv.innerText = 'Đang khởi tạo mô hình...';
    const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
    detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
    statusDiv.innerText = 'Mô hình đã sẵn sàng.';
    if (video.src || video.srcObject) {
      renderPrediction();
    }
  } catch (error) {
    statusDiv.innerText = `Lỗi khởi tạo mô hình: ${error.message}`;
  }
}

async function renderPrediction() {
  if (video.readyState === 4 && detector) {
    const poses = await detector.estimatePoses(video);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (poses && poses.length > 0) {
      const keypoints = poses[0].keypoints;
      const PUSHUP_ANGLE_THRESHOLD = parseFloat(pushupThresholdInput.value);
      const SQUAT_KNEE_ANGLE_THRESHOLD = parseFloat(squatThresholdInput.value);
      const DISTANCE_THRESHOLD = parseFloat(distanceThresholdInput.value);

      const { elbowSide, kneeSide } = selectBestSide(keypoints);
      selectedSideDisplay.innerText = `Elbow: ${elbowSide}, Knee: ${kneeSide}`;

      const elbowKeypointIndices = elbowSide === 'left' ? [5, 7, 9] : [6, 8, 10];
      const kneeKeypointIndices = kneeSide === 'left' ? [11, 13, 15] : [12, 14, 16];
      
      const elbowAngle = getAngle(keypoints[elbowKeypointIndices[0]], keypoints[elbowKeypointIndices[1]], keypoints[elbowKeypointIndices[2]]);
      const kneeAngle = getAngle(keypoints[kneeKeypointIndices[0]], keypoints[kneeKeypointIndices[1]], keypoints[kneeKeypointIndices[2]]);
      const shoulderKeypoint = keypoints[elbowKeypointIndices[0]];
      const kneeKeypoint = keypoints[kneeKeypointIndices[1]];
      const shoulderToKneeDistance = getEuclideanDistance(shoulderKeypoint, kneeKeypoint);
      
      elbowAngleDisplay.innerText = elbowAngle ? elbowAngle.toFixed(1) + '°' : 'N/A';
      kneeAngleDisplay.innerText = kneeAngle ? kneeAngle.toFixed(1) + '°' : 'N/A';
      shoulderKneeDisplay.innerText = shoulderToKneeDistance ? shoulderToKneeDistance.toFixed(1) + ' px' : 'N/A';
      
      processWorkout(elbowAngle, kneeAngle, shoulderToKneeDistance, PUSHUP_ANGLE_THRESHOLD, SQUAT_KNEE_ANGLE_THRESHOLD, DISTANCE_THRESHOLD);
      
      drawKeypoints(keypoints, ctx);
      drawSkeleton(keypoints, ctx);
      if (elbowAngle) drawAngle(keypoints[elbowKeypointIndices[0]], keypoints[elbowKeypointIndices[1]], keypoints[elbowKeypointIndices[2]], ctx, `Elbow: ${elbowAngle.toFixed(1)}°`);
      if (kneeAngle) drawAngle(keypoints[kneeKeypointIndices[0]], keypoints[kneeKeypointIndices[1]], keypoints[kneeKeypointIndices[2]], ctx, `Knee: ${kneeAngle.toFixed(1)}°`);
    }
  }
  requestAnimationFrame(renderPrediction);
}

function processWorkout(elbowAngle, kneeAngle, shoulderToKneeDistance, pushupAngleThres, squatAngleThres, distThres) {
  if (shoulderToKneeDistance === null || elbowAngle === null || kneeAngle === null) return;
  
  if (flag_pushup === 'up') {
    if (elbowAngle > pushupState.max_angle) {
      pushupState.max_angle = elbowAngle;
      pushupState.farthest_distance = shoulderToKneeDistance;
    }
    if (elbowAngle < pushupAngleThres && pushupState.max_angle > 0) {
      flag_pushup = 'down';
    }
  } else if (flag_pushup === 'down') {
    if (elbowAngle < pushupState.min_angle) {
      pushupState.min_angle = elbowAngle;
      pushupState.closest_distance = shoulderToKneeDistance;
    }
    if (elbowAngle > pushupAngleThres + 20) {
      flag_pushup = 'up';
      const distanceChange = Math.abs(pushupState.farthest_distance - pushupState.closest_distance);
      if (distanceChange < distThres) {
        pushupCount++;
        document.getElementById('pushupCount').innerText = pushupCount;
      }
      pushupState.max_angle = 0;
      pushupState.min_angle = 180;
      pushupState.farthest_distance = null;
      pushupState.closest_distance = null;
    }
  }

  if (flag_squat === 'up') {
    if (kneeAngle > squatState.max_angle) {
      squatState.max_angle = kneeAngle;
      squatState.farthest_distance = shoulderToKneeDistance;
    }
    if (kneeAngle < squatAngleThres && squatState.max_angle > 0) {
      flag_squat = 'down';
    }
  } else if (flag_squat === 'down') {
    if (kneeAngle < squatState.min_angle) {
      squatState.min_angle = kneeAngle;
      squatState.closest_distance = shoulderToKneeDistance;
    }
    if (kneeAngle > squatAngleThres + 20) {
      flag_squat = 'up';
      const distanceChange = Math.abs(squatState.farthest_distance - squatState.closest_distance);
      if (distanceChange > distThres) {
        squatCount++;
        document.getElementById('squatCount').innerText = squatCount;
      }
      squatState.max_angle = 0;
      squatState.min_angle = 180;
      squatState.farthest_distance = null;
      squatState.closest_distance = null;
    }
  }

  updateDebugUI();
}

function updateDebugUI() {
  document.getElementById('pushupFlag').innerText = flag_pushup;
  document.getElementById('pushupFarthest').innerText = pushupState.farthest_distance ? pushupState.farthest_distance.toFixed(1) : "N/A";
  document.getElementById('pushupClosest').innerText = pushupState.closest_distance ? pushupState.closest_distance.toFixed(1) : "N/A";
  document.getElementById('squatFlag').innerText = flag_squat;
  document.getElementById('squatFarthest').innerText = squatState.farthest_distance ? squatState.farthest_distance.toFixed(1) : "N/A";
  document.getElementById('squatClosest').innerText = squatState.closest_distance ? squatState.closest_distance.toFixed(1) : "N/A";
}

video.addEventListener('loadeddata', () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  if (detector) {
    renderPrediction();
  }
});