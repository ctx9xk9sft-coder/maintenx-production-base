import { useEffect, useMemo, useState } from "react";
import InfoCard from "./components/InfoCard.jsx";
import { formatRsd, formatNum } from "./utils/formatters.js";
import InputPanel from "./components/InputPanel.jsx";
import VehicleSummarySection from "./components/dashboard/VehicleSummarySection.jsx";
import MaintenancePlanSection from "./components/dashboard/MaintenancePlanSection.jsx";
import BusinessDashboard from "./components/dashboard/BusinessDashboard.jsx";
import VehicleHeader from "./components/dashboard/VehicleHeader.jsx";
import FleetKpiSection from "./components/dashboard/FleetKpiSection.jsx";
import CostStructureSection from "./components/dashboard/CostStructureSection.jsx";
import ScenarioComparisonSection from "./components/dashboard/ScenarioComparisonSection.jsx";
import FleetOptimizerSection from "./components/dashboard/FleetOptimizerSection.jsx";
import { useFleetCalculatorController } from "./hooks/useFleetCalculatorController.js";
import { getContracts, saveContract } from "./services/acceptedContractStore.js";

function buildSelectedScenario({
  scenarioComparisonData,
  selectedScenarioId,
  contractMonths,
  planTotalNonMaintenance,
  tcoBreakdown,
  exploitationLabel,
}) {
  if (!Array.isArray(scenarioComparisonData) || scenarioComparisonData.length === 0) {
    return null;
  }

  const fallbackScenario = scenarioComparisonData[scenarioComparisonData.length - 1];
  const selected =
    scenarioComparisonData.find((item) => String(item.km) === String(selectedScenarioId)) ||
    fallbackScenario;

  if (!selected) return null;

  const maintenanceCost = Number(selected.totalCost || 0);
  const nonMaintenanceCost = Number(planTotalNonMaintenance || 0);
  const totalCost = maintenanceCost + nonMaintenanceCost;
  const plannedKm = Number(selected.km || 0);

  return {
    scenarioId: String(selected.km),
    label: `${formatNum(selected.km, 0)} km`,
    plannedKm,
    contractMonths,
    maintenanceCost,
    nonMaintenanceCost,
    totalCost,
    costPerKm: plannedKm > 0 ? totalCost / plannedKm : 0,
    costPerMonth: contractMonths > 0 ? totalCost / contractMonths : 0,
    eventCount: Number(selected.eventCount || 0),
    usageLabel: selected.usageLabel || exploitationLabel || "-",
    flexInterval: selected.flexInterval || null,
    maintenanceBreakdown: {
      service: Number(selected.serviceCost || 0),
      brakes: Number(selected.brakeCost || 0),
      tires: Number(selected.tireCost || 0),
    },
    tcoBreakdown: {
      maintenance: maintenanceCost,
      registration: Number(tcoBreakdown?.registration || 0),
      insurance: Number(tcoBreakdown?.insurance || 0),
      leasing: Number(tcoBreakdown?.leasing || 0),
      administrative: Number(tcoBreakdown?.administrative || 0),
      extraordinary: Number(tcoBreakdown?.extraordinary || 0),
      operating: Number(tcoBreakdown?.operating || 0),
    },
  };
}

function buildAcceptedContractSnapshot({
  sessionUser,
  decoded,
  resolvedVehicle,
  maintenancePlan,
  quoteReadiness,
  exploitationLabel,
  tireCategory,
  selectedScenario,
}) {
  const scenario = selectedScenario || null;

  return {
    id: `acv_${Date.now()}`,
    acceptedAt: new Date().toISOString(),
    acceptedBy: sessionUser?.displayName || null,
    company: sessionUser?.company || null,
    vin: decoded?.vin || null,
    modelLabel: `${decoded?.marka || "Škoda"} ${decoded?.model || "-"}`,
    vehicleSnapshot: resolvedVehicle?.canonicalVehicle || resolvedVehicle?.vehicle || null,
    quoteSnapshot: {
      status: quoteReadiness?.status || "blocked",
      label: quoteReadiness?.label || null,
      selectedScenarioId: scenario?.scenarioId || null,
      selectedScenarioLabel: scenario?.label || null,
    },
    contractParams: {
      plannedKm: scenario?.plannedKm || null,
      contractMonths: scenario?.contractMonths || null,
      exploitationLabel,
      tireCategory,
    },
    selectedScenario,
    planSnapshot: {
      totals: {
        ...(maintenancePlan?.totals || {}),
        totalCost: Number(scenario?.totalCost || maintenancePlan?.totals?.totalCost || 0),
        maintenanceTotal: Number(
          scenario?.maintenanceCost || maintenancePlan?.totals?.maintenanceTotal || 0
        ),
        nonMaintenanceTotal: Number(
          scenario?.nonMaintenanceCost || maintenancePlan?.totals?.nonMaintenanceTotal || 0
        ),
        costPerKm: Number(scenario?.costPerKm || maintenancePlan?.totals?.costPerKm || 0),
        costPerMonth: Number(
          scenario?.costPerMonth || maintenancePlan?.totals?.costPerMonth || 0
        ),
        totalEvents: Number(scenario?.eventCount || maintenancePlan?.totals?.totalEvents || 0),
      },
      pricingMeta: {
        ...(maintenancePlan?.pricingMeta || {}),
        selectedScenario,
        tcoBreakdown: scenario?.tcoBreakdown || maintenancePlan?.pricingMeta?.tcoBreakdown || null,
      },
    },
  };
}

function StepBar({ currentStep, setCurrentStep, canGoToAnalysis }) {
  const steps = [
    { id: 1, label: "1. Unos" },
    { id: 2, label: "2. Analiza" },
    { id: 3, label: "3. Potvrda" },
  ];

  return (
    <div style={styles.stepperWrap}>
      {steps.map((step) => {
        const disabled = step.id > 1 && !canGoToAnalysis;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => {
              if (!disabled) setCurrentStep(step.id);
            }}
            style={{
              ...styles.stepBtn,
              ...(currentStep === step.id ? styles.stepBtnActive : {}),
              ...(disabled ? styles.stepBtnDisabled : {}),
            }}
          >
            {step.label}
          </button>
        );
      })}
    </div>
  );
}

function AcceptedContractsList({ acceptedContracts }) {
  return (
    <div style={styles.contentCard}>
      <h2 style={styles.sectionTitle}>Prihvaćeni ugovori</h2>
      {acceptedContracts.length === 0 ? (
        <div style={styles.muted}>Još nema prihvaćenih ugovora.</div>
      ) : (
        <div style={styles.acceptedContractsList}>
          {acceptedContracts.map((contract) => (
            <div key={contract.id} style={styles.acceptedContractCard}>
              <div style={styles.acceptedContractTopRow}>
                <div style={styles.acceptedContractTitle}>{contract.modelLabel}</div>
                <div style={styles.acceptedContractBadge}>
                  {String(contract.quoteSnapshot?.status || "-").toUpperCase()}
                </div>
              </div>
              <div style={styles.acceptedContractMeta}>{contract.vin || "Bez VIN-a"}</div>
              <div style={styles.acceptedContractMeta}>
                {contract.contractParams?.contractMonths || "-"} mes ·{" "}
                {contract.contractParams?.plannedKm || "-"} km
              </div>
              {contract.quoteSnapshot?.selectedScenarioLabel ? (
                <div style={styles.acceptedContractMeta}>
                  Scenario: {contract.quoteSnapshot.selectedScenarioLabel}
                </div>
              ) : null}
              <div style={styles.acceptedContractMeta}>
                Planirano ukupno:{" "}
                {formatRsd(Number(contract.planSnapshot?.totals?.totalCost || 0))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const {
    sessionUser,
    viewMode,
    setViewMode,
    selectedProfileId,
    loadProfile,
    vin,
    setVin,
    plannedKm,
    setPlannedKm,
    contractMonths,
    setContractMonths,
    exploitationType,
    setExploitationType,
    hourlyRate,
    setHourlyRate,
    oilPricePerLiter,
    setOilPricePerLiter,
    tireCategory,
    setTireCategory,
    flexInterval,
    setFlexInterval,
    laborDiscount,
    setLaborDiscount,
    partsDiscount,
    setPartsDiscount,
    oilDiscount,
    setOilDiscount,
    engineOverride,
    setEngineOverride,
    gearboxOverride,
    setGearboxOverride,
    drivetrainOverride,
    setDrivetrainOverride,
    registrationAnnual,
    setRegistrationAnnual,
    insuranceAnnual,
    setInsuranceAnnual,
    leasingMonthly,
    setLeasingMonthly,
    adminMonthly,
    setAdminMonthly,
    extraordinaryReserve,
    setExtraordinaryReserve,
    operatingMonthly,
    setOperatingMonthly,
    decoded,
    exploitation,
    annualKm,
    resolvedVehicle,
    resolverMissingConfirmations,
    canBuildProvisionalPlan,
    maintenancePlan,
    maintenanceGateMessage,
    vehicleLabel,
    exploitationLabel,
    vehiclePresentation,
    showExpertSections,
    engineLabel,
    gearboxLabel,
    drivetrainLabel,
    businessStatusLabel,
    vehicleConfidence,
    pricingConfidence,
    quoteReadiness,
    quoteReadinessUi,
    explainabilityNotes,
    planTotalCost,
    planTotalMaintenance,
    planTotalNonMaintenance,
    planTotalService,
    planTotalBrakes,
    planTotalTires,
    planTotalEvents,
    planCostPerKm,
    planCostPerMonth,
    planTotalLeasing,
    planTotalInsurance,
    serviceEvents,
    brakeEvents,
    tireEvents,
    scenarioRows,
    scenarioComparisonData,
    tcoBreakdown,
    EXPLOITATION_PROFILES,
  } = useFleetCalculatorController();

  const [acceptedContracts, setAcceptedContracts] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedScenarioId, setSelectedScenarioId] = useState(null);

  useEffect(() => {
    setAcceptedContracts(getContracts());
  }, []);

  useEffect(() => {
    if (!Array.isArray(scenarioComparisonData) || scenarioComparisonData.length === 0) {
      setSelectedScenarioId(null);
      return;
    }

    if (
      !selectedScenarioId ||
      !scenarioComparisonData.some((row) => String(row.km) === String(selectedScenarioId))
    ) {
      const expectedScenario = scenarioComparisonData.find(
        (row) => Number(row.km) === Number(plannedKm)
      );
      setSelectedScenarioId(
        String((expectedScenario || scenarioComparisonData[scenarioComparisonData.length - 1]).km)
      );
    }
  }, [scenarioComparisonData, selectedScenarioId, plannedKm]);

  const canGoToAnalysis = Boolean(decoded?.supported) && Boolean(maintenancePlan);

  const selectedScenario = useMemo(
    () =>
      buildSelectedScenario({
        scenarioComparisonData,
        selectedScenarioId,
        contractMonths,
        planTotalNonMaintenance,
        tcoBreakdown,
        exploitationLabel,
      }),
    [
      scenarioComparisonData,
      selectedScenarioId,
      contractMonths,
      planTotalNonMaintenance,
      tcoBreakdown,
      exploitationLabel,
    ]
  );

  const canAcceptQuote =
    Boolean(maintenancePlan) &&
    Boolean(selectedScenario) &&
    ["ready", "provisional"].includes(quoteReadiness?.status);

  const latestAcceptedContract = useMemo(() => acceptedContracts[0] || null, [acceptedContracts]);

  function handleAcceptQuote() {
    if (!canAcceptQuote) return;

    const snapshot = buildAcceptedContractSnapshot({
      sessionUser,
      decoded,
      resolvedVehicle,
      maintenancePlan,
      quoteReadiness,
      exploitationLabel,
      tireCategory,
      selectedScenario,
    });

    saveContract(snapshot);
    setAcceptedContracts(getContracts());
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.hero}>
          <div>
            <div style={styles.heroBadge}>Demo licensed environment</div>
            <h1 style={styles.heroTitle}>Fleet Maintenance &amp; TCO Calculator</h1>
            <div style={styles.heroSubtitle}>
              Škoda-only kalkulator za leasing, rent-a-car i fleet operacije.
            </div>
          </div>

          <div style={styles.heroMetaWrap}>
            <div style={styles.heroMetaCard}>
              <div style={styles.heroMetaLabel}>KORISNIK</div>
              <div style={styles.heroMetaValue}>{sessionUser.displayName}</div>
            </div>
            <div style={styles.heroMetaCard}>
              <div style={styles.heroMetaLabel}>KOMPANIJA</div>
              <div style={styles.heroMetaValue}>{sessionUser.company}</div>
            </div>
            <div style={styles.modeSwitcher}>
              <button
                type="button"
                onClick={() => setViewMode("business")}
                style={{ ...styles.modeBtn, ...(viewMode === "business" ? styles.modeBtnActive : {}) }}
              >
                Business
              </button>
              <button
                type="button"
                onClick={() => setViewMode("expert")}
                style={{ ...styles.modeBtn, ...(viewMode === "expert" ? styles.modeBtnActiveDark : {}) }}
              >
                Expert
              </button>
            </div>
          </div>
        </div>

        <StepBar currentStep={currentStep} setCurrentStep={setCurrentStep} canGoToAnalysis={canGoToAnalysis} />

        {currentStep === 1 ? (
          <div style={styles.mainGrid}>
            <InputPanel
              viewMode={viewMode}
              selectedProfileId={selectedProfileId}
              loadProfile={loadProfile}
              vin={vin}
              setVin={setVin}
              plannedKm={plannedKm}
              setPlannedKm={setPlannedKm}
              contractMonths={contractMonths}
              setContractMonths={setContractMonths}
              exploitationType={exploitationType}
              setExploitationType={setExploitationType}
              hourlyRate={hourlyRate}
              setHourlyRate={setHourlyRate}
              oilPricePerLiter={oilPricePerLiter}
              setOilPricePerLiter={setOilPricePerLiter}
              tireCategory={tireCategory}
              setTireCategory={setTireCategory}
              flexInterval={flexInterval}
              setFlexInterval={setFlexInterval}
              laborDiscount={laborDiscount}
              setLaborDiscount={setLaborDiscount}
              partsDiscount={partsDiscount}
              setPartsDiscount={setPartsDiscount}
              oilDiscount={oilDiscount}
              setOilDiscount={setOilDiscount}
              registrationAnnual={registrationAnnual}
              setRegistrationAnnual={setRegistrationAnnual}
              insuranceAnnual={insuranceAnnual}
              setInsuranceAnnual={setInsuranceAnnual}
              leasingMonthly={leasingMonthly}
              setLeasingMonthly={setLeasingMonthly}
              adminMonthly={adminMonthly}
              setAdminMonthly={setAdminMonthly}
              extraordinaryReserve={extraordinaryReserve}
              setExtraordinaryReserve={setExtraordinaryReserve}
              operatingMonthly={operatingMonthly}
              setOperatingMonthly={setOperatingMonthly}
              exploitation={exploitation}
              decoded={decoded}
              annualKm={annualKm}
              formatRsd={formatRsd}
              formatNum={formatNum}
              EXPLOITATION_PROFILES={EXPLOITATION_PROFILES}
              engineOverride={engineOverride}
              setEngineOverride={setEngineOverride}
              gearboxOverride={gearboxOverride}
              setGearboxOverride={setGearboxOverride}
              drivetrainOverride={drivetrainOverride}
              setDrivetrainOverride={setDrivetrainOverride}
              resolverMissingConfirmations={resolverMissingConfirmations}
            />

            <div>
              <div style={styles.contentCard}>
                <h2 style={styles.sectionTitle}>Unos i validacija</h2>
                <div style={styles.muted}>
                  Na ovom koraku pripremaš vozilo, ugovor i assumptions. Tek kada kalkulacija postoji, prelaziš na analizu.
                </div>
                <div style={styles.kpiRow}>
                  <div style={styles.kpiTile}>
                    <div style={styles.kpiLabel}>VIN status</div>
                    <div style={styles.kpiValue}>{decoded?.supported ? "Podržan" : "Nije podržan"}</div>
                  </div>
                  <div style={styles.kpiTile}>
                    <div style={styles.kpiLabel}>Quote readiness</div>
                    <div style={styles.kpiValue}>{quoteReadinessUi.label}</div>
                  </div>
                  <div style={styles.kpiTile}>
                    <div style={styles.kpiLabel}>Plan</div>
                    <div style={styles.kpiValue}>{maintenancePlan ? "Spreman za analizu" : "Još nije spreman"}</div>
                  </div>
                </div>
                {maintenanceGateMessage ? <div style={styles.blockedBox}>{maintenanceGateMessage}</div> : null}
                <div style={styles.actionRow}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    disabled={!canGoToAnalysis}
                    style={{ ...styles.primaryBtn, ...(!canGoToAnalysis ? styles.btnDisabled : {}) }}
                  >
                    Nastavi na analizu
                  </button>
                </div>
              </div>
              <AcceptedContractsList acceptedContracts={acceptedContracts} />
            </div>
          </div>
        ) : null}

        {currentStep === 2 ? (
          <div>
            <div style={styles.contentCard}>
              <div style={styles.contentHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>Rezultati i analiza</h2>
                  <div style={styles.muted}>
                    Ovde proveravaš vozilo, troškove, scenarije i odlučuješ koji scenario postaje zvanični quote baseline.
                  </div>
                </div>
                <div style={styles.headerBadgeWrap}>
                  <span style={styles.darkBadge}>{`Status: ${businessStatusLabel}`}</span>
                  <span style={styles.lightBadge}>{sessionUser.company}</span>
                </div>
              </div>

              {!decoded.supported ? (
                <div style={{ color: "#b91c1c", fontWeight: 700, marginTop: 12 }}>{decoded.reason}</div>
              ) : (
                <>
                  <VehicleHeader
                    image={vehiclePresentation.image}
                    title={vehiclePresentation.label}
                    engine={engineLabel}
                    gearbox={gearboxLabel}
                    drivetrain={drivetrainLabel}
                    powerKw={decoded?.powerKw || decoded?.enginePowerKw || decoded?.kw || null}
                  />

                  <VehicleSummarySection
                    vehicleLabel={vehicleLabel}
                    engineLabel={engineLabel}
                    gearboxLabel={gearboxLabel}
                    drivetrainLabel={drivetrainLabel}
                    plannedKm={plannedKm}
                    contractMonths={contractMonths}
                    exploitationLabel={exploitationLabel}
                    tireCategory={tireCategory}
                    hourlyRate={hourlyRate}
                    oilPricePerLiter={oilPricePerLiter}
                  />

                  <div style={styles.contentCardInner}>
                    <div style={styles.candidateTitle}>Confidence &amp; guardrails</div>
                    <div style={styles.resolverGrid}>
                      <div style={styles.gateCard}>
                        <div style={styles.gateLabel}>Quote readiness</div>
                        <div style={{ ...styles.gateBadge, ...quoteReadinessUi.style }}>{quoteReadinessUi.label}</div>
                      </div>
                      <div style={styles.gateCard}>
                        <div style={styles.gateLabel}>Vehicle confidence</div>
                        <div style={styles.resolverValue}>{String(vehicleConfidence?.level || "-").toUpperCase()}</div>
                      </div>
                      <div style={styles.gateCard}>
                        <div style={styles.gateLabel}>Pricing confidence</div>
                        <div style={styles.resolverValue}>{String(pricingConfidence?.level || "-").toUpperCase()}</div>
                      </div>
                    </div>
                  </div>

                  {explainabilityNotes?.length > 0 ? (
                    <div style={styles.alertInfo}>
                      <div style={styles.alertTitle}>Guardrail upozorenja i pretpostavke</div>
                      <div style={styles.warningList}>
                        {explainabilityNotes.slice(0, 6).map((warning, index) => (
                          <div key={`${warning}-${index}`} style={styles.warningItem}>
                            {warning}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <BusinessDashboard
              totalCost={selectedScenario?.totalCost || planTotalCost}
              maintenanceTotal={selectedScenario?.maintenanceCost || planTotalMaintenance}
              nonMaintenanceTotal={selectedScenario?.nonMaintenanceCost || planTotalNonMaintenance}
              serviceCost={planTotalService}
              brakeCost={planTotalBrakes}
              tireCost={planTotalTires}
              leasingCost={selectedScenario?.tcoBreakdown?.leasing || planTotalLeasing || 0}
              insuranceCost={selectedScenario?.tcoBreakdown?.insurance || planTotalInsurance || 0}
              costPerKm={selectedScenario?.costPerKm || planCostPerKm}
              costPerMonth={selectedScenario?.costPerMonth || planCostPerMonth}
              eventCount={selectedScenario?.eventCount || planTotalEvents}
            />

            <FleetKpiSection
              totalCost={selectedScenario?.totalCost || planTotalCost}
              contractMonths={contractMonths}
              plannedKm={selectedScenario?.plannedKm || plannedKm}
              serviceEvents={serviceEvents}
              brakeEvents={brakeEvents}
              tireEvents={tireEvents}
            />

            <CostStructureSection
              totalCost={selectedScenario?.totalCost || planTotalCost}
              serviceCost={planTotalService}
              brakeCost={planTotalBrakes}
              tireCost={planTotalTires}
              breakdown={selectedScenario?.tcoBreakdown || tcoBreakdown || null}
            />

            <ScenarioComparisonSection scenarios={scenarioComparisonData} formatRsd={formatRsd} formatNum={formatNum} />
            <FleetOptimizerSection scenarios={scenarioComparisonData} formatRsd={formatRsd} formatNum={formatNum} />

            <MaintenancePlanSection
              serviceEvents={serviceEvents}
              brakeEvents={brakeEvents}
              tireEvents={tireEvents}
              totalServiceCost={planTotalService}
              totalBrakeCost={planTotalBrakes}
              totalTireCost={planTotalTires}
              totalCost={selectedScenario?.maintenanceCost || planTotalMaintenance || planTotalCost}
              totalEvents={selectedScenario?.eventCount || planTotalEvents}
              showExpertSections={showExpertSections}
              formatNum={formatNum}
              formatRsd={formatRsd}
            />

            <div style={styles.contentCard}>
              <div style={styles.contentHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>Scenario selection</h2>
                  <div style={styles.muted}>
                    Izaberi scenario koji postaje zvanični quote baseline i ulazi u accepted contract.
                  </div>
                </div>
                {selectedScenario ? <span style={styles.lightBadge}>{`Selected: ${selectedScenario.label}`}</span> : null}
              </div>

              {!canBuildProvisionalPlan ? (
                <div style={styles.blockedBox}>
                  Plan je blokiran dok se ne dopune obavezni tehnički podaci o vozilu.
                </div>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Scenario</th>
                        <th style={styles.thRight}>KM</th>
                        <th style={styles.thRight}>Maintenance</th>
                        <th style={styles.thRight}>Non-maintenance</th>
                        <th style={styles.thRight}>Ukupni TCO</th>
                        <th style={styles.thRight}>Trošak / mesec</th>
                        <th style={styles.thRight}>Akcija</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenarioComparisonData.map((row) => {
                        const isSelected = String(row.km) === String(selectedScenarioId);
                        const maintenanceCost = Number(row.totalCost || 0);
                        const totalCost = maintenanceCost + Number(planTotalNonMaintenance || 0);
                        const monthlyCost = contractMonths > 0 ? totalCost / contractMonths : 0;

                        return (
                          <tr key={row.km} style={isSelected ? styles.selectedScenarioRow : undefined}>
                            <td style={styles.td}>{formatNum(row.km, 0)} km</td>
                            <td style={styles.tdRight}>{formatNum(row.km, 0)}</td>
                            <td style={styles.tdRight}>{formatRsd(maintenanceCost)}</td>
                            <td style={styles.tdRight}>{formatRsd(planTotalNonMaintenance)}</td>
                            <td style={styles.tdRight}>{formatRsd(totalCost)}</td>
                            <td style={styles.tdRight}>{formatRsd(monthlyCost)}</td>
                            <td style={styles.tdRight}>
                              <button
                                type="button"
                                onClick={() => setSelectedScenarioId(String(row.km))}
                                style={{
                                  ...(isSelected ? styles.primaryBtn : styles.secondaryBtn),
                                  padding: "10px 12px",
                                }}
                              >
                                {isSelected ? "Izabrano" : "Izaberi"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={styles.actionRow}>
              <button type="button" onClick={() => setCurrentStep(1)} style={styles.secondaryBtn}>
                Nazad na unos
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                style={{ ...styles.primaryBtn, ...(!selectedScenario ? styles.btnDisabled : {}) }}
                disabled={!selectedScenario}
              >
                Potvrdi izabrani scenario
              </button>
            </div>
          </div>
        ) : null}

        {currentStep === 3 ? (
          <div>
            <div style={styles.contentCard}>
              <div style={styles.contentHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>Potvrda i prihvatanje</h2>
                  <div style={styles.muted}>
                    Finalna provera izabranog scenarija pre kreiranja prihvaćenog ugovora.
                  </div>
                </div>
                <div style={styles.headerBadgeWrap}>
                  <span style={styles.darkBadge}>{`Status: ${businessStatusLabel}`}</span>
                </div>
              </div>

              <div style={styles.confirmGrid}>
                <InfoCard label="Vozilo" value={vehicleLabel} />
                <InfoCard label="Motor / menjač" value={`${engineLabel} / ${gearboxLabel}`} />
                <InfoCard label="Pogon" value={drivetrainLabel} />
                <InfoCard label="Scenario" value={selectedScenario?.label || "-"} />
                <InfoCard
                  label="Kilometraža / trajanje"
                  value={`${formatNum(selectedScenario?.plannedKm || plannedKm, 0)} km / ${contractMonths} mes`}
                />
                <InfoCard label="Tip eksploatacije" value={selectedScenario?.usageLabel || exploitationLabel} />
                <InfoCard label="Quote readiness" value={quoteReadinessUi.label} />
                <InfoCard label="Ukupni trošak" value={formatRsd(selectedScenario?.totalCost || planTotalCost)} />
                <InfoCard label="Maintenance" value={formatRsd(selectedScenario?.maintenanceCost || 0)} />
                <InfoCard label="Non-maintenance" value={formatRsd(selectedScenario?.nonMaintenanceCost || 0)} />
                <InfoCard label="Trošak / km" value={formatRsd(selectedScenario?.costPerKm || planCostPerKm)} />
                <InfoCard label="Trošak / mesec" value={formatRsd(selectedScenario?.costPerMonth || planCostPerMonth)} />
              </div>

              <div style={styles.actionRow}>
                <button type="button" onClick={() => setCurrentStep(2)} style={styles.secondaryBtn}>
                  Nazad na analizu
                </button>
                <button
                  type="button"
                  onClick={handleAcceptQuote}
                  disabled={!canAcceptQuote}
                  style={{ ...styles.primaryBtn, ...(!canAcceptQuote ? styles.btnDisabled : {}) }}
                >
                  Prihvati ponudu
                </button>
              </div>

              {latestAcceptedContract ? (
                <div style={styles.acceptedInfoBox}>
                  <div style={styles.alertTitle}>Poslednji prihvaćen ugovor</div>
                  <div style={styles.warningItem}>
                    {latestAcceptedContract.modelLabel} ·{" "}
                    {latestAcceptedContract.contractParams?.contractMonths || "-"} mes ·{" "}
                    {latestAcceptedContract.contractParams?.plannedKm || "-"} km
                  </div>
                  {latestAcceptedContract.quoteSnapshot?.selectedScenarioLabel ? (
                    <div style={styles.warningItem}>
                      Scenario: {latestAcceptedContract.quoteSnapshot.selectedScenarioLabel}
                    </div>
                  ) : null}
                  <div style={styles.warningItem}>
                    Planirano ukupno:{" "}
                    {formatRsd(Number(latestAcceptedContract.planSnapshot?.totals?.totalCost || 0))}
                  </div>
                </div>
              ) : null}
            </div>

            <AcceptedContractsList acceptedContracts={acceptedContracts} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "linear-gradient(to bottom, #f1f5f9, #ffffff, #f1f5f9)", padding: 24, color: "#0f172a", fontFamily: "Arial, sans-serif" },
  container: { maxWidth: 1500, margin: "0 auto" },
  hero: { background: "#020617", color: "#fff", borderRadius: 28, padding: 28, display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center", marginBottom: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.12)" },
  heroBadge: { fontSize: 14, color: "#cbd5e1", marginBottom: 12 },
  heroTitle: { fontSize: 48, margin: 0, lineHeight: 1.05 },
  heroSubtitle: { marginTop: 12, color: "#cbd5e1", fontSize: 18 },
  heroMetaWrap: { display: "grid", gridTemplateColumns: "repeat(3, minmax(160px, 1fr))", gap: 12, minWidth: 520, alignItems: "stretch" },
  heroMetaCard: { border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", padding: 18, borderRadius: 20 },
  heroMetaLabel: { fontSize: 12, color: "#94a3b8", marginBottom: 8 },
  heroMetaValue: { fontSize: 18, fontWeight: 700 },
  modeSwitcher: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: 8, minWidth: 220 },
  modeBtn: { border: "1px solid rgba(255,255,255,0.18)", background: "transparent", color: "#cbd5e1", borderRadius: 14, padding: "14px 16px", fontSize: 15, fontWeight: 700, cursor: "pointer" },
  modeBtnActive: { background: "#fff", color: "#0f172a", border: "1px solid #fff" },
  modeBtnActiveDark: { background: "#16a34a", color: "#fff", border: "1px solid #16a34a" },
  stepperWrap: { display: "flex", gap: 12, marginBottom: 20 },
  stepBtn: { border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", borderRadius: 14, padding: "12px 18px", fontWeight: 800, cursor: "pointer" },
  stepBtnActive: { border: "1px solid #0f172a", background: "#0f172a", color: "#fff" },
  stepBtnDisabled: { opacity: 0.45, cursor: "not-allowed" },
  mainGrid: { display: "grid", gridTemplateColumns: "460px 1fr", gap: 24, alignItems: "start" },
  contentCard: { background: "#fff", borderRadius: 28, padding: 28, boxShadow: "0 1px 10px rgba(0,0,0,0.08)", marginBottom: 20 },
  sectionTitle: { fontSize: 22, margin: "0 0 16px" },
  muted: { color: "#64748b", fontSize: 16 },
  contentHeader: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", marginBottom: 18 },
  headerBadgeWrap: { display: "flex", gap: 10, alignItems: "center" },
  darkBadge: { background: "#0f172a", color: "#fff", padding: "8px 12px", borderRadius: 999, fontWeight: 700, fontSize: 14 },
  lightBadge: { border: "1px solid #cbd5e1", padding: "8px 12px", borderRadius: 12, fontSize: 14, color: "#334155", background: "#fff" },
  confirmGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(180px, 1fr))", gap: 14, marginBottom: 18 },
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(3, minmax(160px, 1fr))", gap: 14, marginTop: 18, marginBottom: 18 },
  kpiTile: { border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, background: "#fff" },
  kpiLabel: { fontSize: 13, color: "#64748b", marginBottom: 10 },
  kpiValue: { fontSize: 18, fontWeight: 800, color: "#0f172a" },
  actionRow: { display: "flex", gap: 12, alignItems: "center", marginTop: 18, marginBottom: 6 },
  primaryBtn: { border: "1px solid #166534", background: "#16a34a", color: "#fff", borderRadius: 12, padding: "12px 16px", fontWeight: 800, fontSize: 14, cursor: "pointer" },
  secondaryBtn: { border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", borderRadius: 12, padding: "12px 16px", fontWeight: 800, fontSize: 14, cursor: "pointer" },
  btnDisabled: { opacity: 0.45, cursor: "not-allowed" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "12px 10px", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: 14, verticalAlign: "top" },
  thRight: { textAlign: "right", padding: "12px 10px", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: 14, verticalAlign: "top" },
  td: { padding: "14px 10px", borderBottom: "1px solid #f1f5f9", fontSize: 16, verticalAlign: "top" },
  tdRight: { padding: "14px 10px", borderBottom: "1px solid #f1f5f9", textAlign: "right", fontSize: 16, verticalAlign: "top" },
  contentCardInner: { marginTop: 18, paddingTop: 18, borderTop: "1px solid #e2e8f0" },
  candidateTitle: { fontSize: 18, fontWeight: 700, marginBottom: 12 },
  resolverGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(160px, 1fr))", gap: 12 },
  gateCard: { border: "1px solid #e2e8f0", borderRadius: 16, padding: 14, background: "#fff" },
  gateLabel: { fontSize: 14, color: "#64748b", marginBottom: 10 },
  gateBadge: { display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 38, padding: "8px 12px", borderRadius: 999, fontSize: 13, fontWeight: 800 },
  resolverValue: { fontSize: 15, fontWeight: 700, color: "#0f172a" },
  alertInfo: { border: "1px solid #cbd5e1", background: "#f8fafc", borderRadius: 18, padding: 16 },
  alertTitle: { fontSize: 16, fontWeight: 700, marginBottom: 10 },
  warningList: { display: "grid", gap: 8 },
  warningItem: { fontSize: 15, color: "#334155" },
  blockedBox: { border: "1px solid #fca5a5", background: "#fef2f2", color: "#991b1b", borderRadius: 18, padding: 18, fontSize: 16, fontWeight: 700, marginTop: 16 },
  acceptedContractsList: { display: "grid", gap: 12 },
  acceptedContractCard: { border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, background: "#fff" },
  acceptedContractTopRow: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 8 },
  acceptedContractTitle: { fontSize: 16, fontWeight: 800, color: "#0f172a" },
  acceptedContractBadge: { padding: "6px 10px", borderRadius: 999, background: "#e2e8f0", color: "#334155", fontSize: 12, fontWeight: 800 },
  acceptedContractMeta: { fontSize: 14, color: "#475569", marginTop: 6 },
  selectedScenarioRow: { background: "#f0fdf4" },
  acceptedInfoBox: { border: "1px solid #cbd5e1", background: "#f8fafc", borderRadius: 18, padding: 16, marginTop: 16 },
};
