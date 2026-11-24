import { BRAND, formatMT, loyaltyStatus, PAYMENT_ACCOUNTS, PAYMENT_LABEL, rewardOptions } from '@kota/shared';
import { Clock, Flame, Gift, MapPin, MessageCircle, Phone } from 'lucide-react';
import { actions, useAppState } from '../lib/store';

export function ClubView() {
  const { orders, profile, menu } = useAppState();
  const ls = loyaltyStatus(orders, profile.phone);

  return (
    <div className="mx-auto grid max-w-5xl animate-fadeUp gap-4 lg:grid-cols-2">
      <section className="card overflow-hidden">
        <div className="bg-gradient-to-br from-gold-600 to-ember p-5">
          <p className="font-display text-xs uppercase tracking-[0.25em] text-white/80">Clube Fidelidade</p>
          <h2 className="font-display text-3xl font-bold uppercase text-white">{ls.rewardReady ? 'Prémio desbloqueado!' : `${ls.stamps} de ${ls.goal} selos`}</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-5 gap-2" role="img" aria-label={`${ls.stamps} de ${ls.goal} selos`}>
            {Array.from({ length: ls.goal }).map((_, i) => {
              const on = i < ls.stamps;
              return (
                <div key={i} className={`grid aspect-square place-items-center rounded-2xl border-2 text-2xl transition ${on ? 'border-gold bg-gold/15' : 'border-dashed border-coal-500 bg-coal-900 text-neutral-600'}`}>
                  {on ? <Flame className="text-ember animate-flame" fill="currentColor" /> : i + 1}
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-neutral-300">
            A cada <b>pedido entregue</b> ganha 1 selo. Com {ls.goal} selos escolhe <b className="text-gold-400">1 Refresco Txoti</b> ou <b className="text-gold-400">1 Sande de Queijo</b> grátis.
          </p>
          {ls.rewardReady && (
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-gold/10 p-3 text-sm font-semibold text-gold-400">
              <Gift size={18} /> Escolha o prémio no carrinho: {rewardOptions(menu).map((m) => m.name).join(' ou ')}.
            </p>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="club-name">Nome</label>
              <input id="club-name" className="input" value={profile.name} onChange={(e) => actions.setProfile({ name: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="club-phone">Telemóvel do cartão</label>
              <input id="club-phone" className="input" inputMode="tel" value={profile.phone} onChange={(e) => actions.setProfile({ phone: e.target.value })} />
            </div>
          </div>
          <p className="mt-2 text-xs text-neutral-500">O selo entra quando o pedido deste telemóvel fica Entregue na cozinha.</p>
        </div>
      </section>

      <section className="card-pad space-y-4">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase leading-tight">{BRAND.name}</h2>
          <p className="font-display text-lg uppercase tracking-widest text-gold-400">{BRAND.tagline}</p>
        </div>
        <ul className="space-y-2.5 text-sm text-neutral-200">
          <li className="flex gap-3"><MapPin className="shrink-0 text-ember-400" size={18} /> {BRAND.address}, {BRAND.city}</li>
          <li className="flex gap-3"><Clock className="shrink-0 text-ember-400" size={18} /> {BRAND.hours}</li>
          {BRAND.phones.map((p) => (
            <li key={p} className="flex gap-3">
              <Phone className="shrink-0 text-ember-400" size={18} />
              <a className="underline-offset-2 hover:underline" href={`tel:${p.replace(/\s/g, '')}`}>{p}</a>
              <a className="ml-auto text-[#25D366]" aria-label={`WhatsApp ${p}`} href={`https://wa.me/${p.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><MessageCircle size={18} /></a>
            </li>
          ))}
        </ul>
        <div className="rounded-2xl border border-coal-500 bg-coal-900 p-3 text-sm">
          <p className="label">Contas oficiais</p>
          <p><b>{PAYMENT_LABEL.mpesa}:</b> {PAYMENT_ACCOUNTS.mpesa.number}</p>
          <p><b>{PAYMENT_LABEL.emola}:</b> {PAYMENT_ACCOUNTS.emola.number}</p>
          <p className="text-neutral-400">Titular: {PAYMENT_ACCOUNTS.mpesa.holder} · também aceitamos P.O.S e Cash</p>
        </div>
        <div className="space-y-1 border-t border-coal-600 pt-3">
          {BRAND.slogans.map((s) => (
            <p key={s} className="font-display text-base uppercase tracking-wide text-neutral-300">“{s}”</p>
          ))}
        </div>
        <p className="text-xs text-neutral-500">Frango inteiro: {formatMT(menu.find((m) => m.id === 'frango-inteiro')?.price ?? 950)} · Linha exclusiva {BRAND.sauceLine}</p>
      </section>
    </div>
  );
}
