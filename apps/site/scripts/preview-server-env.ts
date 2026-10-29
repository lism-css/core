/**
 * Astro 7 の dev / preview は AI エージェント環境（am-i-vibing の判定）を検出するとバックグラウンドのデーモンとして起動し、
 * ロックファイルで管理する。撮影スクリプトは自分で止められる前面のサーバーが要るので、判定に使われる環境変数を外す
 */
export function foregroundServerEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of ['CLAUDECODE', 'CODEX_THREAD_ID', 'CURSOR_TRACE_ID', 'AGENT', 'AI_AGENT']) delete env[key];
  return env;
}
