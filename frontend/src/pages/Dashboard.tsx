import { useState } from "react";
import Sidebar from "../components/Sidebar";

export default function Dashboard() {
  const [activeDataset, setActiveDataset] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("browse");

  return (
    <div style={{ display: "flex" }}>
      
      {/* LEFT */}
      <Sidebar onSelectDataset={setActiveDataset} />

      {/* RIGHT */}
      <div style={{ flex: 1, padding: "1rem" }}>
        <h2>Dataset: {activeDataset || "None selected"}</h2>

        {/* <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

        {activeDataset && activeTab === "browse" && (
          <DataTable table={activeDataset} />
        )}

        {activeDataset && activeTab === "query" && (
          <QueryPanel />
        )}

        {activeDataset && activeTab === "crud" && (
          <CrudPanel table={activeDataset} />
        )} */}
      </div>

    </div>
  );
}