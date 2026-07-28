// ═══════════════════════════════════════════════════════════════
// Assessment & Maturity — assessment instruments and maturity models
// from dea-catalog-assessment-tools and dea-catalog-maturity-models.
// ═══════════════════════════════════════════════════════════════

const ASSESSMENT_INSTRUMENTS = [
  { name: 'Modernization Assessment', desc: 'Evaluates the current state of application and platform modernization — identifying legacy debt, migration readiness, and modernization opportunities.', repo: 'dea-catalog-assessment-tools' },
  { name: 'Technology Assessment', desc: 'Assesses technology stack health, currency, and alignment with strategic direction. Covers languages, frameworks, infrastructure, and tooling.', repo: 'dea-catalog-assessment-tools' },
  { name: 'Operations Assessment', desc: 'Evaluates operational maturity including incident management, monitoring, automation, and SRE practices.', repo: 'dea-catalog-assessment-tools' },
  { name: 'Services Delivery Assessment', desc: 'Measures the effectiveness of service delivery — SLA compliance, service quality, customer satisfaction, and delivery velocity.', repo: 'dea-catalog-assessment-tools' },
  { name: 'Architecture Assessment', desc: 'Reviews architectural compliance, pattern adherence, and alignment with reference models and standards.', repo: 'dea-catalog-assessment-tools' },
  { name: 'Security & Compliance Assessment', desc: 'Evaluates security posture, control effectiveness, and regulatory compliance across the enterprise.', repo: 'dea-catalog-assessment-tools' },
];

const MATURITY_LEVELS = [
  { num: 1, name: 'Ad Hoc', desc: 'No formal processes. Work is performed chaotically with unpredictable results. Success depends on individual heroics.' },
  { num: 2, name: 'Repeatable', desc: 'Basic processes are established and repeatable. Results are somewhat predictable but not yet measured or optimised.' },
  { num: 3, name: 'Defined', desc: 'Processes are documented, standardised, and integrated into the organisation. Roles and responsibilities are clear.' },
  { num: 4, name: 'Managed', desc: 'Processes are measured against quantitative goals. Data-driven decisions drive continuous improvement.' },
  { num: 5, name: 'Optimising', desc: 'Processes are continuously improved through innovation and feedback. The organisation adapts proactively to change.' },
];

const REPO_URLS = {
  'dea-catalog-assessment-tools': 'https://github.com/technehub-labs/dea-catalog-assessment-tools',
  'dea-catalog-maturity-models': 'https://github.com/technehub-labs/dea-catalog-maturity-models',
};

export class AssessmentMaturity {
  constructor(bodyEl) {
    this.bodyEl = bodyEl;
  }

  render() {
    this.bodyEl.innerHTML = `
      <div class="am-section">
        <div class="am-section-title">Assessment Instruments</div>
        <div class="am-instruments">
          ${ASSESSMENT_INSTRUMENTS.map((inst) => `
            <div class="am-instrument">
              <div class="am-instrument-name">${inst.name}</div>
              <div class="am-instrument-desc">${inst.desc}</div>
              <a class="am-instrument-link" href="${REPO_URLS[inst.repo]}" target="_blank" rel="noopener">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                ${inst.repo}
              </a>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="am-section">
        <div class="am-section-title">Capability Maturity Model</div>
        <p style="font-size:0.85rem;color:var(--text-2);line-height:1.6;margin-bottom:var(--sp-4);">
          The DEA capability maturity model defines a five-level progression for enterprise architecture practices.
          Each level builds on the previous, moving from chaotic ad-hoc execution to continuous, data-driven optimisation.
        </p>
        <div class="am-levels">
          ${MATURITY_LEVELS.map((lvl) => `
            <div class="am-level">
              <span class="am-level-num">${lvl.num}</span>
              <span class="am-level-name">${lvl.name}</span>
              <span class="am-level-desc">${lvl.desc}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="am-section">
        <div class="am-section-title">Source Repositories</div>
        <div class="am-repo-links">
          <a class="am-repo-link" href="${REPO_URLS['dea-catalog-assessment-tools']}" target="_blank" rel="noopener">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
            dea-catalog-assessment-tools
          </a>
          <a class="am-repo-link" href="${REPO_URLS['dea-catalog-maturity-models']}" target="_blank" rel="noopener">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
            dea-catalog-maturity-models
          </a>
        </div>
      </div>
    `;
  }
}
