// Submission requirement, not decoration: the assessment asks that the app
// itself display the author's name and a description of PM Accelerator with
// a link to their LinkedIn page. Rendered as a footer so it is visible on
// both tabs without competing with the weather UI. Copy is taken verbatim
// from docs/PMA_DESCRIPTION.md.

const PMA_LINKEDIN = 'https://www.linkedin.com/school/pmaccelerator/';

// The four programmes PMA offers, kept in a collapsible list so the footer
// stays compact while the full description remains available on the page.
const PMA_SERVICES = [
  {
    name: 'PMA Pro',
    detail:
      'End-to-end product manager job hunting program that helps you master FAANG-level Product Management skills, conduct unlimited mock interviews, and gain job referrals through our largest alumni network. 25% of our offers came from tier 1 companies and get paid as high as $800K/year.',
  },
  {
    name: 'AI PM Bootcamp',
    detail:
      'Gain hands-on AI Product Management skills by building a real-life AI product with a team of AI Engineers, data scientists, and designers. We will also help you launch your product with real user engagement using our 100,000+ PM community and social media channels.',
  },
  {
    name: 'PMA Power Skills',
    detail:
      'Designed for existing product managers to sharpen their product management skills, leadership skills, and executive presentation skills.',
  },
  {
    name: 'PMA Leader',
    detail:
      'We help you accelerate your product management career, get promoted to Director and product executive levels, and win in the board room.',
  },
];

function AboutFooter() {
  return (
    <footer className="rounded-2xl bg-white p-5 shadow-md sm:p-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-800">About this project</h2>
        <p className="mt-1 text-sm text-slate-600">
          WeatherWise — built by{' '}
          <span className="font-semibold text-slate-800">Benijeh Douglas-Inegbedion</span> for the
          PM Accelerator AI Engineer Intern technical assessment.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Submitted for both Tech Assessment #1 (frontend) and Tech Assessment #2 (backend).
        </p>
      </div>

      <div className="pt-4">
        <h3 className="text-sm font-bold text-slate-800">
          About the Product Manager Accelerator
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          The Product Manager Accelerator Program is designed to support PM professionals through
          every stage of their careers. From students looking for entry-level jobs to Directors
          looking to take on a leadership role, our program has helped over hundreds of students
          fulfill their career aspirations.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Our Product Manager Accelerator community are ambitious and committed. Through our
          program they have learnt, honed and developed new PM and leadership skills, giving them a
          strong foundation for their future endeavors.
        </p>

        <details className="mt-3 group">
          <summary className="cursor-pointer text-sm font-medium text-sky-700 hover:text-sky-800">
            Services PM Accelerator offers
          </summary>
          <ul className="mt-2 space-y-2">
            {PMA_SERVICES.map((service) => (
              <li key={service.name} className="text-sm text-slate-600">
                <span aria-hidden="true">🚀</span>{' '}
                <span className="font-semibold text-slate-800">{service.name}</span> —{' '}
                {service.detail}
              </li>
            ))}
          </ul>
        </details>

        <a
          href={PMA_LINKEDIN}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm font-medium text-sky-700 underline
                     hover:text-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-200"
        >
          Product Manager Accelerator on LinkedIn →
        </a>
      </div>
    </footer>
  );
}

export default AboutFooter;
