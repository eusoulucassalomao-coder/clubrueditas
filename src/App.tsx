import { useCallback, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { Layout } from './components/Layout';
import { CookiePreferences } from './components/CookiePreferences';
import { MemberCardModal } from './components/MemberCardModal';
import { PWAInstallGate } from './components/PWAInstallGate';
import { PWAStatusBanners } from './components/PWAStatusBanners';
import { NotificationPermissionPrompt } from './components/NotificationPermissionPrompt';
import { RegistrationModal } from './components/RegistrationModal';
import { RewardDetailModal } from './components/RewardDetailModal';
import { VirtualAssistantDrawer } from './components/VirtualAssistantDrawer';
import { useAppState } from './hooks/useAppState';
import { usePWAInstall } from './hooks/usePWAInstall';
import { TRANSLATIONS } from './i18n/translations';
import { HistoryScreen } from './screens/HistoryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { PointsScreen } from './screens/PointsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { RewardsScreen } from './screens/RewardsScreen';
import { RewardDefinition, TabId } from './types';

export default function App() {
  const {
    language,
    member,
    history,
    rewards,
    milestones,
    lookupByCode,
    refreshMember,
    updateMarketingPreference,
    hasMember,
    loading,
    apiError,
    setLanguage,
    updateMember,
    simulateRedeemReward,
    registerDemoAccount,
  } = useAppState();

  const { platform, isInstallable, isInstalled, install } = usePWAInstall();
  const t = TRANSLATIONS[language];

  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [selectedReward, setSelectedReward] = useState<RewardDefinition | null>(
    null
  );
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [memberCardOpen, setMemberCardOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [globalToast, setGlobalToast] = useState<string | null>(null);

  const [installGateDismissed, setInstallGateDismissed] = useState<boolean>(false);

  const showToast = useCallback((message: string) => {
    setGlobalToast(message);
    window.setTimeout(() => {
      setGlobalToast((current) => (current === message ? null : current));
    }, 3600);
  }, []);

  const handleDismissInstallGate = useCallback(() => {
    setInstallGateDismissed(true);
  }, []);

  const handleNavigate = useCallback((tab: TabId) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleInstallAction = useCallback(async () => {
    if (!isInstallable) {
      showToast(t.pwa.installUnavailableToast);
      return;
    }

    const result = await install();
    if (result === 'accepted') {
      showToast(t.pwa.installSuccessToast);
    } else if (result === 'unavailable') {
      showToast(t.pwa.installUnavailableToast);
    }
  }, [install, isInstallable, showToast, t.pwa.installSuccessToast, t.pwa.installUnavailableToast]);

  return (
    <MotionConfig reducedMotion="user">
      <PWAInstallGate
        platform={platform}
        isInstalled={isInstalled}
        isInstallable={isInstallable}
        dismissed={installGateDismissed}
        language={language}
        onChangeLanguage={setLanguage}
        onInstall={install}
        onContinueInBrowser={handleDismissInstallGate}
        t={t}
      />

      <NotificationPermissionPrompt isInstalled={isInstalled} language={language} />

      <Layout
        activeTab={activeTab}
        onSelectTab={handleNavigate}
        onOpenAssistant={() => setAssistantOpen(true)}
        t={t}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeTab === 'home' && (
              hasMember ? (
                <HomeScreen
                  member={member}
                  history={history}
                  rewards={rewards}
                  language={language}
                  t={t}
                  isInstalled={isInstalled}
                  isInstallable={isInstallable}
                  onInstallPwa={handleInstallAction}
                  onNavigate={handleNavigate}
                  onSelectReward={setSelectedReward}
                  onOpenMemberCard={() => setMemberCardOpen(true)}
                  onOpenRegister={() => setRegisterOpen(true)}
                />
              ) : (
                <section className="mx-auto max-w-2xl rounded-3xl border border-[#E7DFCC] bg-white p-8 text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EAEFE5]">
                    <span className="font-display text-2xl font-semibold text-[#4A5D3F]">R</span>
                  </div>
                  <h1 className="font-display text-3xl font-semibold text-[#293622]">Bienvenido al Club La Ruedita</h1>
                  <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#5A6353]">
                    Regístrate con tu nombre, teléfono y fecha de nacimiento para recibir tu código de socio y consultar tus puntos.
                    Si ya eres miembro, abre el asistente y escribe tu código.
                  </p>
                  <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    <button onClick={() => setRegisterOpen(true)} className="min-h-12 rounded-2xl bg-[#4A5D3F] px-6 text-sm font-semibold text-white">Unirme al Club</button>
                    <button onClick={() => setAssistantOpen(true)} className="min-h-12 rounded-2xl border border-[#D8CEB8] px-6 text-sm font-semibold text-[#293622]">Ya soy miembro</button>
                  </div>
                  {loading && <p className="mt-4 text-xs text-[#6B7365]">Conectando con el Club...</p>}
                </section>
              )
            )}

            {activeTab === 'points' && (
              <PointsScreen
                member={member}
                history={history}
                milestones={milestones}
                onRefresh={refreshMember}
                language={language}
                t={t}
              />
            )}

            {activeTab === 'rewards' && (
              <RewardsScreen
                currentPoints={member.points}
                rewards={rewards}
                language={language}
                t={t}
                onSelectReward={setSelectedReward}
              />
            )}

            {activeTab === 'history' && (
              <HistoryScreen history={history} language={language} t={t} onRefresh={refreshMember} />
            )}

            {activeTab === 'profile' && (
              hasMember ? (
                <ProfileScreen
                  member={member}
                  language={language}
                  t={t}
                  isInstalled={isInstalled}
                  onChangeLanguage={setLanguage}
                  onUpdateMember={updateMember}
                  onOpenRegister={() => setRegisterOpen(true)}
                  onInstallPwa={handleInstallAction}
                />
              ) : (
                <section className="rounded-3xl border border-[#E7DFCC] bg-white p-8 text-center">
                  <h1 className="font-display text-2xl font-semibold text-[#293622]">Tu perfil del Club</h1>
                  <p className="mt-2 text-sm text-[#5A6353]">Regístrate o consulta tu código de socio en el asistente para ver tus datos.</p>
                  <button onClick={() => setRegisterOpen(true)} className="mt-5 min-h-11 rounded-xl bg-[#4A5D3F] px-5 text-sm font-semibold text-white">Crear cuenta</button>
                </section>
              )
            )}
          </motion.div>
        </AnimatePresence>
      </Layout>

      {globalToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md rounded-2xl bg-[#293622] text-[#FAF7F0] px-4 py-3 text-sm font-medium shadow-lg text-center"
        >
          {globalToast}
        </div>
      )}

      <RewardDetailModal
        reward={selectedReward}
        currentPoints={member.points}
        language={language}
        t={t}
        onClose={() => setSelectedReward(null)}
        onConfirmRedeem={simulateRedeemReward}
      />

      <MemberCardModal
        isOpen={memberCardOpen}
        onClose={() => setMemberCardOpen(false)}
        member={member}
        language={language}
        t={t}
      />

      <RegistrationModal
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
        t={t}
        onRegister={registerDemoAccount}
      />

      <VirtualAssistantDrawer
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        member={member}
        language={language}
        t={t}
        onNavigate={handleNavigate}
        onOpenRegister={() => setRegisterOpen(true)}
        rewards={rewards}
        onLookupCode={lookupByCode}
      />

      <CookiePreferences onMarketingChange={updateMarketingPreference} />

      {apiError && !loading && (
        <div role="alert" className="fixed bottom-16 left-1/2 z-40 -translate-x-1/2 rounded-xl bg-[#8C3B2D] px-4 py-3 text-sm text-white shadow-lg">{apiError}</div>
      )}

      <PWAStatusBanners t={t} />
    </MotionConfig>
  );
}
