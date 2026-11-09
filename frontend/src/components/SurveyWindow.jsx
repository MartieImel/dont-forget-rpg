export default function SurveyWindow({ children, progress, backgroundUrl }) {
  const screenStyle = backgroundUrl
    ? {
        backgroundImage: `linear-gradient(rgba(5,5,12,0.55), rgba(5,5,12,0.75)), url(${backgroundUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  return (
    <div className="survey-monitor">
      <div className="survey-titlebar">
        <span>SURVEY_PROGRAM.EXE</span>
        <div className="survey-titlebar-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="survey-screen" style={screenStyle}>
        {children}
      </div>
      {progress && (
        <div className="survey-footer">
          <span>DON'T FORGET SURVEY SYSTEM v0.2.1</span>
          <div className="survey-progress">
            {progress.map((done, i) => (
              <span key={i} className={done ? "done" : ""} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
