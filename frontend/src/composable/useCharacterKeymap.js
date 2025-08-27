import { watch, ref } from 'vue';

// このコンポーザブルは、キャラクターフックとキー入力の状態を引数に取る
export function useCharacterKeymap(characterHook, keysPressed) {

  // アニメーションの状態をここで管理する
  const currentAction = ref('idle');

  // アニメーションを切り替える内部関数
  function switchToAction(from, to) {
    if (from && to) {
      from.fadeOut(0.25);
      to.reset().fadeIn(0.25).play();
    }
  }

  // Spaceキーでジャンプ
  watch(() => keysPressed.value[' '], (newValue, oldValue) => {
    if (newValue && !oldValue) {
      characterHook.jump();
    }
  });

  // WASDキーでの移動アニメーション切り替え
  watch(keysPressed, (currentKeys) => {
    const isMoving = currentKeys['w'] || currentKeys['a'] || currentKeys['s'] || currentKeys['d'];
    const idle = characterHook.idleAction;
    const walk = characterHook.walkAction;

    if (!idle || !walk) return;

    if (isMoving && currentAction.value !== 'walk') {
      switchToAction(idle, walk);
      currentAction.value = 'walk';
    } else if (!isMoving && currentAction.value !== 'idle') {
      switchToAction(walk, idle);
      currentAction.value = 'idle';
    }
  }, { deep: true });

  // このコンポーザブルが管理する状態を返す（必要であれば）
  return {
    currentAction,
  };
}
