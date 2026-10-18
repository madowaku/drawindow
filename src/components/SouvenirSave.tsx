import { useEffect, useRef, useState } from 'react';
import { createSouvenir, type SouvenirOptions } from '../lib/souvenir';

export function SouvenirSave(props: Omit<SouvenirOptions, 'includeWords'>) {
  const t = (en: string, ja: string) => props.language === 'ja' ? ja : en;
  const [includeWords, setIncludeWords] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'busy' | 'ready' | 'error'>('idle');
  const mounted = useRef(true);
  const saving = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const save = async () => {
    if (saving.current) return;
    saving.current = true; setStatus('busy');
    try {
      const blob = await createSouvenir({ ...props, includeWords });
      if (mounted.current) { setPreview(URL.createObjectURL(blob)); setStatus('ready'); }
    } catch { if (mounted.current) setStatus('error'); }
    finally { saving.current = false; }
  };
  return <div className="souvenir">
    <label><input type="checkbox" checked={includeWords} disabled={status === 'busy'} onChange={e => { setIncludeWords(e.target.checked); setPreview(null); setStatus('idle'); }} />{t('Include words and interpretations', '名前と解釈も入れる')}</label>
    <button className="secondary" disabled={status === 'busy'} onClick={() => void save()}>{status === 'busy' ? t('Making your keepsake…', '記念の１枚を作っています…') : t("SAVE TODAY’S WINDOW", '今日の窓を残す')}</button>
    <p>{t('Made on your device. Nothing is uploaded or shared.', '画像はこの端末で作ります。送信・自動共有はしません。')}</p>
    <p role="status">{status === 'ready' ? t('Your image is ready. Download it, or hold the image to save on your phone.', '画像ができました。ダウンロード、または画像を長押しして保存してください。') : status === 'error' ? t('The image could not be created. Your drawings are safe; please try again.', '画像を作れませんでした。絵は残っています。もう一度お試しください。') : ''}</p>
    {preview && <><a href={preview} download="DRAWINDOW-todays-window.png">{t('Download image', '画像をダウンロード')}</a><img src={preview} width={1200} height={3000} alt={t('Your ten drawings together in one keepsake', '10枚の絵をまとめた記念画像')} /></>}
  </div>;
}
