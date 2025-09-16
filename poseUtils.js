// =======================
// 1. Hàm tính góc
// =======================
function getAngle(p1, p2, p3) {
    if (!p1 || !p2 || !p3 || p1.score < 0.5 || p2.score < 0.5 || p3.score < 0.5) {
        return null;
    }
    const a = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const b = Math.hypot(p2.x - p3.x, p2.y - p3.y);
    const c = Math.hypot(p1.x - p3.x, p1.y - p3.y);

    if (a === 0 || b === 0) return null;
    const angleRad = Math.acos((a*a + b*b - c*c) / (2 * a * b));
    return angleRad * 180 / Math.PI;
}

// =======================
// 2. Hàm vẽ keypoints
// =======================
function drawKeypoints(keypoints, ctx) {
    keypoints.forEach(keypoint => {
        if (keypoint.score > 0.5) {
            ctx.beginPath();
            ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();
        }
    });
}

// =======================
// 3. Hàm vẽ bộ xương
// =======================
// const skeletonConnections = [
//     [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
//     [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
//     [24, 26], [26, 28]
// ];
const skeletonConnections = [
  [0,1], [0,2], [1,3], [2,4],        // mặt: mũi, mắt, tai
  [5,6],                             // vai trái – vai phải
  [5,7], [7,9],                      // tay trái: vai – khuỷu – cổ tay
  [6,8], [8,10],                     // tay phải: vai – khuỷu – cổ tay
  [5,11], [6,12],                    // vai – hông
  [11,12],                           // hông trái – hông phải
  [11,13], [13,15],                  // chân trái: hông – gối – cổ chân
  [12,14], [14,16]                   // chân phải: hông – gối – cổ chân
];

function drawSkeleton(keypoints, ctx) {
    ctx.strokeStyle = 'green';
    ctx.lineWidth = 3;
    skeletonConnections.forEach(([i, j]) => {
        const p1 = keypoints[i];
        const p2 = keypoints[j];
        if (p1 && p2 && p1.score > 0.5 && p2.score > 0.5) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    });
}

// =======================
// 4. Hàm vẽ góc
// =======================
function drawAngle(p1, p2, p3, ctx, angleText) {
    if (!p1 || !p2 || !p3 || p1.score < 0.5 || p2.score < 0.5 || p3.score < 0.5) return;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.strokeStyle = 'purple';
    ctx.lineWidth = 2;
    ctx.stroke();

    const midX = (p2.x + p1.x) / 2;
    const midY = (p2.y + p1.y) / 2;
    ctx.fillStyle = 'white';
    ctx.fillRect(midX - 20, midY - 15, 40, 20);
    ctx.fillStyle = 'black';
    ctx.fillText(angleText, midX, midY);
}

// =======================
// Các hàm tính toán và vẽ giữ nguyên
// ...
// =======================

// Hàm mới để chọn bộ keypoints có điểm tin cậy cao hơn
function selectBestSide(keypoints) {
    // Các cặp keypoint cho vai, khuỷu tay, cổ tay
    const leftElbowSet = [keypoints[11], keypoints[13], keypoints[15]]; // Vai, Khuỷu, Cổ tay trái
    const rightElbowSet = [keypoints[12], keypoints[14], keypoints[16]]; // Vai, Khuỷu, Cổ tay phải

    // Các cặp keypoint cho hông, đầu gối, mắt cá chân
    const leftKneeSet = [keypoints[23], keypoints[25], keypoints[27]]; // Hông, Gối, Mắt cá trái
    const rightKneeSet = [keypoints[24], keypoints[26], keypoints[28]]; // Hông, Gối, Mắt cá phải

    const elbowScores = [
        leftElbowSet.reduce((sum, p) => sum + (p ? p.score : 0), 0) / leftElbowSet.length,
        rightElbowSet.reduce((sum, p) => sum + (p ? p.score : 0), 0) / rightElbowSet.length
    ];

    const kneeScores = [
        leftKneeSet.reduce((sum, p) => sum + (p ? p.score : 0), 0) / leftKneeSet.length,
        rightKneeSet.reduce((sum, p) => sum + (p ? p.score : 0), 0) / rightKneeSet.length
    ];

    const elbowSide = elbowScores[0] > elbowScores[1] ? 'left' : 'right';
    const kneeSide = kneeScores[0] > kneeScores[1] ? 'left' : 'right';

    return { elbowSide, kneeSide };
}

// =======================
// 5. Hàm tính khoảng cách Euclid
// =======================
function getEuclideanDistance(p1, p2) {
    if (!p1 || !p2 || p1.score < 0.5 || p2.score < 0.5) {
        return null;
    }
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}