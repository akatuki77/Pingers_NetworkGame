import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

export function useCharacter() {
  let character = null;
  let mixer = null;
  // 物理・移動関連の状態をコンポーザブル内で管理
  let yVelocity = 0;
  let xVelocity = 0; // 水平方向の速度を追加
  let zVelocity = 0; // 水平方向の速度を追加
  const gravity = -20;
  let isGrounded = false;

  let targetRotationY = 0;
  const rotationSpeed = 0.1;
  const moveSpeed = 3.0;
  const airMoveSpeed = 3.2; // 空中での移動速度を上げる
  const stepTolerance = 0.45; // 段差の許容範囲
  const airResistance = 0.95; // 空中での空気抵抗

  function updatePosition({ delta, keysPressed, raycaster, collidableObjects, castleLocations, backgroundBox }) {
    if (!character) return null;

    // --- 重力と地面との接地判定 ---
    const groundRayOrigin = character.position.clone();
    groundRayOrigin.y += 0.5;
    raycaster.set(groundRayOrigin, new THREE.Vector3(0, -1, 0));
    const groundIntersects = raycaster.intersectObjects(collidableObjects, true);

    if (groundIntersects.length > 0) {
      const groundY = groundIntersects[0].point.y;
      if (character.position.y <= groundY + 0.15 && yVelocity <= 0) {
        character.position.y = groundY;
        yVelocity = 0;
        // 接地時に水平方向の速度もリセット
        xVelocity = 0;
        zVelocity = 0;
        isGrounded = true;
      } else {
        isGrounded = false;
      }
    } else {
      isGrounded = false;
    }

    if (!isGrounded) {
      yVelocity += gravity * delta;
    }
    character.position.y += yVelocity * delta;

    // --- 移動と前方衝突判定 ---
    const isMoving = keysPressed['w'] || keysPressed['a'] || keysPressed['s'] || keysPressed['d'];
    let hitCastleInfo = null;

    if(isMoving) {
        // 同時押しに対応した移動方向の計算
        let moveX = 0;
        let moveZ = 0;

        if (keysPressed['w']) moveX -= 1; // 左（X軸負方向）
        if (keysPressed['s']) moveX += 1; // 右（X軸正方向）
        if (keysPressed['a']) moveZ += 1; // 後（Z軸正方向）
        if (keysPressed['d']) moveZ -= 1; // 前（Z軸負方向）

        // 斜め移動の場合、速度を正規化（対角線の長さを1にする）
        if (moveX !== 0 && moveZ !== 0) {
          const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
          moveX /= length;
          moveZ /= length;
        }

        // 移動方向に基づいてキャラクターの向きを調整
        if (moveX !== 0 || moveZ !== 0) {
          targetRotationY = Math.atan2(moveX, moveZ);
          const targetQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, targetRotationY, 0));
          character.quaternion.slerp(targetQuaternion, rotationSpeed);
        }

        const characterDirection = new THREE.Vector3();
        character.getWorldDirection(characterDirection);
        let isObstacleAhead = false;

        const collisionPoints = [
            new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(0, 0.8, 0),
            new THREE.Vector3(0.3, 0.5, 0), new THREE.Vector3(-0.3, 0.5, 0),
            new THREE.Vector3(0, 1.5, 0)
        ];

        for (const point of collisionPoints) {
            const rayOrigin = point.clone().applyMatrix4(character.matrixWorld);
            // 移動方向に基づいて衝突判定の方向を設定
            const collisionDirection = new THREE.Vector3(moveX, 0, moveZ).normalize();
            raycaster.set(rayOrigin, collisionDirection);
            const intersects = raycaster.intersectObjects(collidableObjects, true);

            if (intersects.length > 0 && intersects[0].distance < 0.5) {
                const hitObject = intersects[0].object;
                if (hitObject.userData.isWall) {
                  isObstacleAhead = true;
                  break;
                }

                const foundCastle = castleLocations.find(info => info.object.children.includes(hitObject) || info.object.id === hitObject.id);
                if (foundCastle) {
                    hitCastleInfo = foundCastle;
                }
                // ジャンプ中は段差判定を緩和
                if (isGrounded) {
                    const heightDifference = intersects[0].point.y - character.position.y;
                    if (Math.abs(heightDifference) > stepTolerance) {
                        isObstacleAhead = true;
                        break;
                    }
                }
            }
        }

        let isCliffAhead = false;
            // ジャンプ中は崖判定を無効化
            if (isGrounded) {
                  const cliffRayOrigin = new THREE.Vector3(
                    character.position.x + moveX * 0.4,
                    character.position.y + 1.0,
                    character.position.z + moveZ * 0.4
                );
                raycaster.set(cliffRayOrigin, new THREE.Vector3(0, -1, 0));
                const cliffIntersects = raycaster.intersectObjects(collidableObjects, true);
                if (cliffIntersects.length === 0 || cliffIntersects[0].point.y < character.position.y - stepTolerance) {
                    isCliffAhead = true;
                }
            }

            // ジャンプ中は衝突判定を緩和し、移動を優先
            if (!isObstacleAhead && !isCliffAhead) {
                const currentMoveSpeed = isGrounded ? moveSpeed : airMoveSpeed;
                const moveDistance = currentMoveSpeed * delta;

                // 同時押しに対応した移動ベクトルの計算
                const moveVector = new THREE.Vector3(moveX * moveDistance, 0, moveZ * moveDistance);

                // 水平方向の速度を更新
                xVelocity = moveVector.x;
                zVelocity = moveVector.z;

                // ジャンプ中は地面との距離チェックを緩和
                if (isGrounded) {
                  const newPosition = character.position.clone().add(moveVector);
                  const finalGroundRayOrigin = newPosition.clone();
                  finalGroundRayOrigin.y += 1.0;
                  raycaster.set(finalGroundRayOrigin, new THREE.Vector3(0, -1, 0));
                  const finalGroundIntersects = raycaster.intersectObjects(collidableObjects, true);
                  let isDestinationOK = false;
                  if (finalGroundIntersects.length > 0) {
                      if (Math.abs(finalGroundIntersects[0].point.y - character.position.y) < stepTolerance) {
                          isDestinationOK = true;
                      }
                  }
                  if (isDestinationOK && backgroundBox.containsPoint(newPosition)) {
                      character.position.copy(newPosition);
                  }
                } else {
                  // 空中では背景ボックスのみチェック
                  const newPosition = character.position.clone().add(moveVector);
                  if (backgroundBox.containsPoint(newPosition)) {
                      character.position.copy(newPosition);
                  }
                }
            }
          }

          // 水平方向の速度を適用（移動キーが押されていない場合でも）
          if (!isGrounded) {
            // 空中では空気抵抗を適用
            xVelocity *= airResistance;
            zVelocity *= airResistance;
          } else {
            // 地面では速度をリセット
            xVelocity = 0;
            zVelocity = 0;
          }

          // 水平方向の移動を適用
          if (Math.abs(xVelocity) > 0.01 || Math.abs(zVelocity) > 0.01) {
            const horizontalMoveVector = new THREE.Vector3(xVelocity * delta, 0, zVelocity * delta);
            const newHorizontalPosition = character.position.clone().add(horizontalMoveVector);

            // 背景ボックス内かチェック
            if (backgroundBox.containsPoint(newHorizontalPosition)) {
              character.position.x = newHorizontalPosition.x;
              character.position.z = newHorizontalPosition.z;
            }
          }
      // 衝突した城の情報を返す
      return hitCastleInfo;
  }

function loadCharacter(scene) {
  return new Promise((resolve, reject) => {
    const mtlLoader = new MTLLoader();

    // ★ 1. MTLローダーに、これから使うファイルの場所を教える
    mtlLoader.setPath('/models/character/');

    // ★ 2. .load()にはファイル名だけを渡す
    mtlLoader.load('momo_boat.mtl', (materials) => {
        materials.preload();

        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);

        // ★ 3. OBJローダーにも、ファイルの場所を教える
        objLoader.setPath('/models/character/');

        // ★ 4. .load()にはファイル名だけを渡す
        objLoader.load('momo_boat.obj', (object) => {
            character = object;
            character.scale.set(0.6, 0.6, 0.6);
            character.position.set(0.2, 2.4, 12.1);
            character.rotation.y = Math.PI;
            character.traverse(child => {
                if (child.isMesh) child.castShadow = true;
            });
            scene.add(character);

            resolve();
          }, undefined, reject);
      }, undefined, reject);
  });
}

  return {
    loadCharacter,
    get character() { return character; },
    get mixer() { return mixer; },
    updatePosition,
  };
}
