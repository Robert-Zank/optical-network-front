interface JohnsonSBTableProps {
  params: [number, number, number, number] | null;
}

export default function JohnsonSBTable({ params }: JohnsonSBTableProps) {
  return (
    <div className="mt-3 border rounded-3 p-3">
      <div className="fw-semibold small">Johnson SB Parameters</div>

      {!params ? (
        <div className="text-muted small mt-1">No prediction yet.</div>
      ) : (
        <div className="table-responsive mt-2">
          <table className="table table-sm mb-0">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Gamma</td>
                <td>{params[0].toFixed(4)}</td>
              </tr>
              <tr>
                <td>Delta</td>
                <td>{params[1].toFixed(4)}</td>
              </tr>
              <tr>
                <td>Lambda</td>
                <td>{params[2].toFixed(4)}</td>
              </tr>
              <tr>
                <td>Xi</td>
                <td>{params[3].toFixed(4)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}