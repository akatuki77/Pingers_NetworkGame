import { useUserStore } from '@/stores/userStore';

// このComposableは、クリア記録を保存する機能を提供します
export function useStageClear() {
  const userStore = useUserStore();

  /**
   * ステージのクリア情報をバックエンドに送信する関数
   * @param {number} stageId - クリアしたステージのID (データベースのstagesテーブルのID)
   */
  const saveClearRecord = async (stageId) => {
    // ログインしていなければ何もしない
    if (!userStore.isLoggedIn || !userStore.user?.id) {
      console.log('ログインしていないため、クリア記録は保存されません。');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userStore.user.id,
          stage_id: stageId,
          // scoreやclear_timeを保存する場合はここに追加
        }),
      });

      if (response.ok) {
        console.log(`ステージID: ${stageId} のクリア情報を保存しました。`);
      } else {
        const data = await response.json();
        console.error('クリア情報の保存に失敗しました:', data.message);
      }
    } catch (error) {
      console.error('サーバーへの接続中にエラーが発生しました:', error);
    }
  };

  // 作成した関数を返す
  return {
    saveClearRecord,
  };
}
