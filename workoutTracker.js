// // =======================
// // 1. Khởi tạo biến
// // =======================
// let pushupCount = 0;
// let squatCount = 0;
// let isPushupDown = false;
// let isSquatDown = false;
// let hipInitialY = null;
// let hipHistory = [];
// const HISTORY_SIZE = 15; // Giảm xuống để phản ứng nhanh hơn
// let detector = null;
// // =======================
// // 2. Tham chiếu DOM và Ngưỡng có thể điều chỉnh
// // =======================
// const video = document.getElementById('video');
// const videoInput = document.getElementById('videoInput');
// const selectFileBtn = document.getElementById('selectFileBtn');
// const openCameraBtn = document.getElementById('openCameraBtn');
// const statusDiv = document.getElementById('status');
// const canvas = document.getElementById('output');
// const ctx = canvas.getContext('2d');

// const elbowAngleDisplay = document.getElementById('elbowAngleDisplay');
// const kneeAngleDisplay = document.getElementById('kneeAngleDisplay');
// const hipDisplacementDisplay = document.getElementById('hipDisplacementDisplay');
// const selectedSideDisplay = document.getElementById('selectedSide');

// // Các input để điều chỉnh ngưỡng
// const pushupThresholdInput = document.getElementById('pushupThresholdInput');
// const squatThresholdInput = document.getElementById('squatThresholdInput');
// const hipPushupThresholdInput = document.getElementById('hipPushupThresholdInput');
// const hipSquatThresholdInput = document.getElementById('hipSquatThresholdInput');


// // =======================
// // 3. Các hàm chính
// // =======================

// // Tải mô hình ngay lập tức khi trang tải
// document.addEventListener('DOMContentLoaded', () => {
//     setupDetector();
// });
// selectFileBtn.addEventListener('click', () => videoInput.click());
// videoInput.addEventListener('change', (event) => {
//     const file = event.target.files[0];
//     if (file) {
//         const videoURL = URL.createObjectURL(file);
//         video.src = videoURL;
//         video.loop = true;
//         video.load();
//     }
// });

// openCameraBtn.addEventListener('click', async () => {
//     try {
//         const stream = await navigator.mediaDevices.getUserMedia({ video: true });
//         video.srcObject = stream;
//         video.load();
//     } catch (err) {
//         statusDiv.innerText = 'Lỗi truy cập camera: ' + err.message;
//     }
// });

// async function setupDetector() {
//     if (detector) return;
//     try {
//         statusDiv.innerText = 'Đang khởi tạo mô hình...';
//         const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
//         detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
//         statusDiv.innerText = 'Mô hình đã sẵn sàng.';
//         // Bắt đầu vòng lặp xử lý video nếu đã có luồng video
//         if (video.src || video.srcObject) {
//             renderPrediction();
//         }
//     } catch (error) {
//         statusDiv.innerText = `Lỗi khởi tạo mô hình: ${error.message}`;
//     }
// }

// async function renderPrediction() {
//     if (video.readyState === 4 && detector) {
//         const poses = await detector.estimatePoses(video);
//         ctx.clearRect(0, 0, canvas.width, canvas.height);
        
//         if (poses && poses.length > 0) {
//             const keypoints = poses[0].keypoints;
            
//             // Lấy các ngưỡng hiện tại từ giao diện
//             const PUSHUP_ANGLE_THRESHOLD = parseFloat(pushupThresholdInput.value);
//             const SQUAT_KNEE_ANGLE_THRESHOLD = parseFloat(squatThresholdInput.value);
//             const PUSHUP_HIP_THRESHOLD_Y = parseFloat(hipPushupThresholdInput.value);
//             const SQUAT_HIP_THRESHOLD_Y = parseFloat(hipSquatThresholdInput.value);

//             // Logic chọn keypoints tốt nhất
//             const { elbowSide, kneeSide } = selectBestSide(keypoints);
//             selectedSideDisplay.innerText = `Elbow: ${elbowSide}, Knee: ${kneeSide}`;

//             // Lấy các điểm cần thiết dựa trên lựa chọn
//             const shoulderKeypoints = elbowSide === 'left' ? [5, 7, 9] : [6, 8, 10];  
//             const kneeKeypoints = kneeSide === 'left' ? [11, 13, 15] : [12, 14, 16];  
//             const hipKeypoints = [keypoints[11], keypoints[12]];

//             const elbowAngle = getAngle(keypoints[shoulderKeypoints[0]], keypoints[shoulderKeypoints[1]], keypoints[shoulderKeypoints[2]]);
//             const kneeAngle = getAngle(keypoints[kneeKeypoints[0]], keypoints[kneeKeypoints[1]], keypoints[kneeKeypoints[2]]);
            
//             // Tính toán độ dịch chuyển hông
//             const midHipY = (hipKeypoints[0].y + hipKeypoints[1].y) / 2;
//             hipHistory.push(midHipY);
//             if (hipHistory.length > HISTORY_SIZE) hipHistory.shift();
//             const hipDisplacement = Math.max(...hipHistory) - Math.min(...hipHistory);

//             // Cập nhật giao diện
//             elbowAngleDisplay.innerText = elbowAngle ? elbowAngle.toFixed(1) + '°' : 'N/A';
//             kneeAngleDisplay.innerText = kneeAngle ? kneeAngle.toFixed(1) + '°' : 'N/A';
//             hipDisplacementDisplay.innerText = hipDisplacement.toFixed(1);
            
//             // Vẽ
//             drawKeypoints(keypoints, ctx);
//             drawSkeleton(keypoints, ctx);
//             if (elbowAngle) drawAngle(keypoints[shoulderKeypoints[0]], keypoints[shoulderKeypoints[1]], keypoints[shoulderKeypoints[2]], ctx, `Elbow: ${elbowAngle.toFixed(1)}°`);
//             if (kneeAngle) drawAngle(keypoints[kneeKeypoints[0]], keypoints[kneeKeypoints[1]], keypoints[kneeKeypoints[2]], ctx, `Knee: ${kneeAngle.toFixed(1)}°`);

//             // Logic đếm được bổ sung
//             processWorkoutCounts(elbowAngle, kneeAngle, hipDisplacement, PUSHUP_ANGLE_THRESHOLD, SQUAT_KNEE_ANGLE_THRESHOLD, PUSHUP_HIP_THRESHOLD_Y, SQUAT_HIP_THRESHOLD_Y);
//         }
//     }
//     requestAnimationFrame(renderPrediction);
// }


// // Hàm xử lý logic đếm riêng
// function processWorkoutCounts(elbowAngle, kneeAngle, hipDisplacement, pushupThreshold, squatThreshold, pushupHipThreshold, squatHipThreshold) {
//     // Phân biệt bài tập dựa trên biên độ dịch chuyển hông
//     if (hipDisplacement < pushupHipThreshold) {
//         // Đang thực hiện Push-up
//         if (elbowAngle !== null) {
//             if (elbowAngle < pushupThreshold) {
//                 isPushupDown = true;
//             } else if (isPushupDown && elbowAngle > pushupThreshold + 20) {
//                 pushupCount++;
//                 isPushupDown = false;
//                 document.getElementById('pushupCount').innerText = pushupCount;
//             }
//         }
//     } else if (hipDisplacement > squatHipThreshold) {
//         // Đang thực hiện Squat
//         if (kneeAngle !== null) {
//             if (kneeAngle < squatThreshold) {
//                 isSquatDown = true;
//             } else if (isSquatDown && kneeAngle > squatThreshold + 20) {
//                 squatCount++;
//                 isSquatDown = false;
//                 document.getElementById('squatCount').innerText = squatCount;
//             }
//         }
//     }
// }

// // Bắt đầu vòng lặp xử lý khi video đã tải
// video.addEventListener('loadeddata', () => {
//     canvas.width = video.videoWidth;
//     canvas.height = video.videoHeight;
//     // Bắt đầu vòng lặp render
//     if (detector) {
//         renderPrediction();
//     }
// });

// // // Khi video đã load
// // video.addEventListener('loadeddata', () => {
// //     canvas.width = video.videoWidth;
// //     canvas.height = video.videoHeight;
// //     if (!detector) {
// //         setupDetector();
// //     }
// // });


// =======================
// 1. Khởi tạo biến và tham chiếu DOM
// =======================
// =======================
// 1. Khởi tạo biến và tham chiếu DOM
// =======================
let pushupCount = 0;
let squatCount = 0;
let detector = null;

// Biến trạng thái mới cho từng bài tập
let flag_pushup = 'up';
let flag_squat = 'up';

// Biến lưu trữ giá trị cho mỗi bài tập
let pushupState = {
    max_angle: 0,
    min_angle: 180,
    farthest_distance: null,
    closest_distance: null,
    started: false // Thêm cờ để biết đã bắt đầu chu trình chưa
};

let squatState = {
    max_angle: 0,
    min_angle: 180,
    farthest_distance: null,
    closest_distance: null,
    started: false
};

const MIN_ANGLE_THRESHOLD = 150; // Ngưỡng góc để phân biệt trạng thái up-down.
const DISTANCE_THRESHOLD = 50; // Ngưỡng khoảng cách chung để phân biệt squat vs pushup


// =======================
// 2. Tham chiếu DOM và Ngưỡng có thể điều chỉnh
// =======================
const video = document.getElementById('video');
const videoInput = document.getElementById('videoInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const openCameraBtn = document.getElementById('openCameraBtn');
const statusDiv = document.getElementById('status');
const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');

const elbowAngleDisplay = document.getElementById('elbowAngleDisplay');
const kneeAngleDisplay = document.getElementById('kneeAngleDisplay');
const shoulderKneeDisplay = document.getElementById('shoulderKneeDisplay');
const selectedSideDisplay = document.getElementById('selectedSide');

// Các input để điều chỉnh ngưỡng
const pushupThresholdInput = document.getElementById('pushupThresholdInput');
const squatThresholdInput = document.getElementById('squatThresholdInput');
const shoulderKneeSquatInput = document.getElementById('shoulderKneeSquatInput');
const shoulderKneePushupInput = document.getElementById('shoulderKneePushupInput');
const distanceThresholdInput = document.getElementById('distanceThresholdInput');

// const flagPushupDisplay = document.getElementById('flagPushup');
// const maxPushupAngleDisplay = document.getElementById('maxPushupAngle');
// const minPushupAngleDisplay = document.getElementById('minPushupAngle');
// const farthestPushupDistanceDisplay = document.getElementById('farthestPushupDistance');
// const closestPushupDistanceDisplay = document.getElementById('closestPushupDistance');
// const totalPushupDistanceChangeDisplay = document.getElementById('totalPushupDistanceChange');

// const flagSquatDisplay = document.getElementById('flagSquat');
// const maxSquatAngleDisplay = document.getElementById('maxSquatAngle');
// const minSquatAngleDisplay = document.getElementById('minSquatAngle');
// const farthestSquatDistanceDisplay = document.getElementById('farthestSquatDistance');
// const closestSquatDistanceDisplay = document.getElementById('closestSquatDistance');
// const totalSquatDistanceChangeDisplay = document.getElementById('totalSquatDistanceChange');
// =======================
// 3. Các hàm chính
// =======================
document.addEventListener('DOMContentLoaded', () => {
    setupDetector();
});

// Các hàm xử lý sự kiện nút
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
            
            // Lấy các ngưỡng hiện tại từ giao diện
            const PUSHUP_ANGLE_THRESHOLD = parseFloat(pushupThresholdInput.value);
            const SQUAT_KNEE_ANGLE_THRESHOLD = parseFloat(squatThresholdInput.value);
            const DISTANCE_THRESHOLD = parseFloat(distanceThresholdInput.value);

            // Logic chọn keypoints tốt nhất
            const { elbowSide, kneeSide } = selectBestSide(keypoints);
            selectedSideDisplay.innerText = `Elbow: ${elbowSide}, Knee: ${kneeSide}`;

            // Lấy các điểm cần thiết dựa trên lựa chọn
            const elbowKeypointIndices = elbowSide === 'left' ? [5, 7, 9] : [6, 8, 10];
            const kneeKeypointIndices = kneeSide === 'left' ? [11, 13, 15] : [12, 14, 16];
            
            const elbowAngle = getAngle(keypoints[elbowKeypointIndices[0]], keypoints[elbowKeypointIndices[1]], keypoints[elbowKeypointIndices[2]]);
            const kneeAngle = getAngle(keypoints[kneeKeypointIndices[0]], keypoints[kneeKeypointIndices[1]], keypoints[kneeKeypointIndices[2]]);
            
            const shoulderKeypoint = keypoints[elbowKeypointIndices[0]];
            const kneeKeypoint = keypoints[kneeKeypointIndices[1]];
            const shoulderToKneeDistance = getEuclideanDistance(shoulderKeypoint, kneeKeypoint);
            
            // Cập nhật giao diện
            elbowAngleDisplay.innerText = elbowAngle ? elbowAngle.toFixed(1) + '°' : 'N/A';
            kneeAngleDisplay.innerText = kneeAngle ? kneeAngle.toFixed(1) + '°' : 'N/A';
            shoulderKneeDisplay.innerText = shoulderToKneeDistance ? shoulderToKneeDistance.toFixed(1) + ' px' : 'N/A';
            
            // Xử lý đếm
            processWorkout(
                elbowAngle, kneeAngle, shoulderToKneeDistance,
                PUSHUP_ANGLE_THRESHOLD, SQUAT_KNEE_ANGLE_THRESHOLD,
                DISTANCE_THRESHOLD
            );

            // Vẽ
            drawKeypoints(keypoints, ctx);
            drawSkeleton(keypoints, ctx);
            if (elbowAngle) drawAngle(keypoints[elbowKeypointIndices[0]], keypoints[elbowKeypointIndices[1]], keypoints[elbowKeypointIndices[2]], ctx, `Elbow: ${elbowAngle.toFixed(1)}°`);
            if (kneeAngle) drawAngle(keypoints[kneeKeypointIndices[0]], keypoints[kneeKeypointIndices[1]], keypoints[kneeKeypointIndices[2]], ctx, `Knee: ${kneeAngle.toFixed(1)}°`);
        }
    }
    requestAnimationFrame(renderPrediction);
}

// Hàm logic mới được tinh chỉnh
function processWorkout(elbowAngle, kneeAngle, shoulderToKneeDistance, pushupAngleThres, squatAngleThres, distThres) {
    if (shoulderToKneeDistance === null || elbowAngle === null || kneeAngle === null) return;

    // --- Logic cho Push-up ---
    // Tìm kiếm khoảng cách lớn nhất
    if (flag_pushup === 'up') {
        if (elbowAngle > pushupState.max_angle) {
            pushupState.max_angle = elbowAngle;
            pushupState.farthest_distance = shoulderToKneeDistance;
        }
        if (elbowAngle < pushupAngleThres && pushupState.max_angle > 0) {
            flag_pushup = 'down';
        }
    }
    // Tìm kiếm khoảng cách nhỏ nhất
    else if (flag_pushup === 'down') {
        if (elbowAngle < pushupState.min_angle) {
            pushupState.min_angle = elbowAngle;
            pushupState.closest_distance = shoulderToKneeDistance;
        }
        if (elbowAngle > pushupAngleThres + 20) { // Thêm 20 độ để tránh nhiễu
            flag_pushup = 'up';
            // Chu trình hoàn tất, tiến hành so sánh
            const distanceChange = Math.abs(pushupState.farthest_distance - pushupState.closest_distance);
            if (distanceChange < distThres) {
                pushupCount++;
                document.getElementById('pushupCount').innerText = pushupCount;
            }
            // Reset trạng thái
            pushupState.max_angle = 0;
            pushupState.min_angle = 180;
            pushupState.farthest_distance = null;
            pushupState.closest_distance = null;
        }
    }

    // --- Logic cho Squat ---
    // Tìm kiếm khoảng cách lớn nhất
    if (flag_squat === 'up') {
        if (kneeAngle > squatState.max_angle) {
            squatState.max_angle = kneeAngle;
            squatState.farthest_distance = shoulderToKneeDistance;
        }
        if (kneeAngle < squatAngleThres && squatState.max_angle > 0) {
            flag_squat = 'down';
        }
    }
    // Tìm kiếm khoảng cách nhỏ nhất
    else if (flag_squat === 'down') {
        if (kneeAngle < squatState.min_angle) {
            squatState.min_angle = kneeAngle;
            squatState.closest_distance = shoulderToKneeDistance;
        }
        if (kneeAngle > squatAngleThres + 20) { // Thêm 20 độ để tránh nhiễu
            flag_squat = 'up';
            // Chu trình hoàn tất, tiến hành so sánh
            const distanceChange = Math.abs(squatState.farthest_distance - squatState.closest_distance);
            if (distanceChange > distThres) {
                squatCount++;
                document.getElementById('squatCount').innerText = squatCount;
            }
            // Reset trạng thái
            squatState.max_angle = 0;
            squatState.min_angle = 180;
            squatState.farthest_distance = null;
            squatState.closest_distance = null;
        }
    }
}

// Bắt đầu vòng lặp xử lý khi video đã tải
video.addEventListener('loadeddata', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (detector) {
        renderPrediction();
    }
});