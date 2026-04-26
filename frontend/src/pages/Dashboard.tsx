import { useState } from "react";
import Sidebar from "../components/Sidebar";
import DataTable from "../components/DataTable";
import QueryPanel from "../components/QueryPanel";
import "../App.css";

export default function Dashboard() {
  const [activeDataset, setActiveDataset] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("browse");
  const [refreshToken, setRefreshToken] = useState(0);

  const handleDatasetSelect = (datasetName: string, forceRefresh = false) => {
    setActiveDataset(datasetName);

    if (forceRefresh || datasetName === activeDataset) {
      setRefreshToken((current) => current + 1);
    }

    setActiveTab("browse");
  };

  return (
    <div className="app-shell">
      <div className="app-header">
        <div>
          <h2 className="app-header__title">Data Workspace</h2>
          <p className="app-header__subtitle">
            Browse datasets or switch to the global query panel.
          </p>
        </div>

        <div className="app-header__tabs">
          <button
            onClick={() => setActiveTab("browse")}
            className={`app-tab ${activeTab === "browse" ? "app-tab--active" : ""}`}
          >
            Browse
          </button>
          <button
            onClick={() => setActiveTab("query")}
            className={`app-tab ${activeTab === "query" ? "app-tab--active" : ""}`}
          >
            Query
          </button>
        </div>
      </div>

      <div className="workspace">
        {/* LEFT */}
        <Sidebar onSelectDataset={handleDatasetSelect} activeDataset={activeDataset} />

        {/* RIGHT */}
        <div className="workspace__content">
          {activeTab === "browse" && (
            activeDataset ? (
              <DataTable tableName={activeDataset} refreshToken={refreshToken} />
            ) : (
              <div className="notice notice--empty">
                Select a dataset from the sidebar to browse it.
              </div>
            )
          )}

          {activeTab === "query" && <QueryPanel />}
        </div>
      </div>
    </div>
  );
}