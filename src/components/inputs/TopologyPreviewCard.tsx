import type { Node } from "../../utils/geoUtils";
import TopologyMapPreview from "./TopologyMapPreview";

interface TopologyPreviewCardProps {
  nodes: Node[];
  onExpand: () => void;
  expandedOnly?: boolean;
}

export default function TopologyPreviewCard({
  nodes,
  onExpand,
  expandedOnly = false,
}: TopologyPreviewCardProps) {
  if (expandedOnly) {
    return <TopologyMapPreview nodes={nodes} height="calc(85vh - 100px)" />;
  }

  return (
    <div className="bg-white border rounded-3 p-3 shadow-sm">
      <div className="d-flex justify-content-between align-items-center">
        <div className="fw-semibold">Topology Preview</div>
        <button
          className="btn btn-outline-secondary btn-sm"
          type="button"
          onClick={onExpand}
          disabled={nodes.length === 0}
        >
          Expand Map
        </button>
      </div>

      <div className="text-muted small mt-1">
        Uploaded node locations will appear here.
      </div>

      <div className="mt-3">
        <TopologyMapPreview nodes={nodes} height="300px" />
      </div>
    </div>
  );
}