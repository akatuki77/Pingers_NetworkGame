import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// export function useCharacter(scene) { // ← scene引数を削除
export function useCharacter() {
  let character = null;
  let mixer = null;
  let idleAction = null;
  let walkAction = null;
  // 物理・移動関連の状態をコンポーザブル内で管理
  let yVelocity = 0;
  const gravity = -20;
  const jumpStrength = 6; // ジャンプ力を調整
  let isGrounded = false;

  let targetRotationY = 0;
  const rotationSpeed = 0.1;
  const moveSpeed = 3.0;
  const airMoveSpeed = 2.5;
  const stepTolerance = 0.45; // 段差の許容範囲

  function jump() {
    if (isGrounded) {
      yVelocity = jumpStrength;
      isGrounded = false;
    }
  }
  function updatePosition({ delta, keysPressed, raycaster, collidableObjects, castleLocations, backgroundBox }) {
    if (!character) return null;

    // --- 重力と地面との接地判定 ---
    const groundRayOrigin = character.position.clone();
    groundRayOrigin.y += 0.5;
    raycaster.set(groundRayOrigin, new THREE.Vector3(0, -1, 0));
    const groundIntersects = raycaster.intersectObjects(collidableObjects, true);

    if (groundIntersects.length > 0) {
      const groundY = groundIntersects[0].point.y;
      if (character.position.y <= groundY + 0.1 && yVelocity <= 0) {
        character.position.y = groundY;
        yVelocity = 0;
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
      if (keysPressed['w']) targetRotationY = -Math.PI / 2;
      if (keysPressed['s']) targetRotationY = Math.PI / 2;
      if (keysPressed['a']) targetRotationY = 0;
      if (keysPressed['d']) targetRotationY = Math.PI;

      const targetQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, targetRotationY, 0));
      character.quaternion.slerp(targetQuaternion, rotationSpeed);

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
          raycaster.set(rayOrigin, characterDirection);
          const intersects = raycaster.intersectObjects(collidableObjects, true);

          if (intersects.length > 0 && intersects[0].distance < 0.5) {
              const hitObject = intersects[0].object;
              const foundCastle = castleLocations.find(info => info.object.children.includes(hitObject) || info.object.id === hitObject.id);
              if (foundCastle) {
                  hitCastleInfo = foundCastle;
              }
              const heightDifference = intersects[0].point.y - character.position.y;
              if (Math.abs(heightDifference) > stepTolerance) {
                  isObstacleAhead = true;
                  break;
              }
          }
      }

      let isCliffAhead = false;
      if (isGrounded) {
           const cliffRayOrigin = new THREE.Vector3(
              character.position.x + characterDirection.x * 0.4,
              character.position.y + 1.0,
              character.position.z + characterDirection.z * 0.4
          );
          raycaster.set(cliffRayOrigin, new THREE.Vector3(0, -1, 0));
          const cliffIntersects = raycaster.intersectObjects(collidableObjects, true);
          if (cliffIntersects.length === 0 || cliffIntersects[0].point.y < character.position.y - stepTolerance) {
              isCliffAhead = true;
          }
      }

      if (!isObstacleAhead && !isCliffAhead) {
          const currentMoveSpeed = isGrounded ? moveSpeed : airMoveSpeed;
          const moveDistance = currentMoveSpeed * delta;
          const moveVector = new THREE.Vector3(0, 0, moveDistance).applyQuaternion(character.quaternion);
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
      }
    }

    // 衝突した城の情報を返す
    return hitCastleInfo;
  }

  // function loadCharacter() { // ← sceneを引数で受け取る
  function loadCharacter(scene) {
    // Promiseを返して非同期処理の完了を扱えるようにする
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load('/models/character/momotaro.glb', (gltf) => {
          character = gltf.scene;
          character.scale.set(0.6, 0.6, 0.6);
          character.position.set(0.2, 2.4, 12.1);
          character.rotation.y = Math.PI;
          character.traverse(child => {
              if (child.isMesh) child.castShadow = true;
          });
          scene.add(character); // ← 引数で受け取ったsceneに追加

          mixer = new THREE.AnimationMixer(character);
          const idleClip = THREE.AnimationClip.findByName(gltf.animations, 'idle');
          const walkClip = THREE.AnimationClip.findByName(gltf.animations, 'walk');
          if (idleClip && walkClip) {
              idleAction = mixer.clipAction(idleClip);
              walkAction = mixer.clipAction(walkClip);
              idleAction.play();
          }
          resolve(); // 読み込み完了を通知
      }, undefined, reject); // エラーハンドリングを追加
    });
  }

  return {
    loadCharacter,
    get character() { return character; },
    get mixer() { return mixer; },
    get idleAction() { return idleAction; },
    get walkAction() { return walkAction; },
    jump,
    updatePosition,
  };
}
