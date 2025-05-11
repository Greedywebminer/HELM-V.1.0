import React from "react";
import { AutoSizer, Column, Table } from "react-virtualized";
import "react-virtualized/styles.css";

function StatusIcon(value) {
  if (value === "OK" || (typeof value === "string" && value.includes("@"))) return "✅";
  if (value === "Fail" || value === "N/A" || !value) return "❌";
  return "🔄";
}

export default function DeviceTable({
  devices,
  selectedDevices,
  toggleDevice,
  setModalDevice,
  setModalOpen,
}) {
  const cellStyle = {
    whiteSpace: "nowrap",
    overflow: "hidden",
    fontSize: "0.7rem",
    padding: "0 8px",
  };

  const headerStyle = {
    whiteSpace: "nowrap",
    overflow: "visible",
    fontSize: "0.75rem",
    padding: "0 8px",
  };

  return (
    <div className="overflow-x-auto border border-cyan-700 rounded-lg" style={{ height: "70vh" }}>
      <AutoSizer>
        {({ width, height }) => (
          <Table
            width={width}
            height={height}
            headerHeight={30}
            rowHeight={55}
            rowCount={devices.length}
            rowGetter={({ index }) => devices[index]}
            rowClassName={({ index }) =>
              index !== -1 && selectedDevices.has(devices[index]?.ip)
                ? "bg-gray-800 text-white border border-cyan-600"
                : "bg-gray-900 text-white border-b border-gray-800 hover:bg-gray-800"
            }
            rowKey={({ index }) => devices[index]?.ip || index}
          >
            <Column
              label=""
              width={40}
              dataKey="select"
              headerStyle={headerStyle}
              style={cellStyle}
              cellRenderer={({ rowData }) => {
                if (!rowData || !rowData.ip) return null;
                const selected = selectedDevices.has(rowData.ip);
                return (
                  <span
                    className="cursor-pointer select-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDevice(rowData.ip);
                    }}
                  >
                    {selected ? "✔️" : "⬜"}
                  </span>
                );
              }}
            />

            <Column
              label="Alias"
              dataKey="alias"
              width={140}
              style={cellStyle}
              headerStyle={headerStyle}
              cellRenderer={({ rowData }) => rowData.alias || "(no alias)"}
            />
            <Column label="IP" dataKey="ip" width={140} style={cellStyle} headerStyle={headerStyle} />
            <Column label="Pool" dataKey="pool" width={140} style={cellStyle} headerStyle={headerStyle} />

            <Column
              label="Hashrate"
              dataKey="hashrate"
              width={100}
              style={cellStyle}
              headerStyle={headerStyle}
              cellRenderer={({ rowData }) =>
                rowData.hashrate && rowData.hashrate !== "N/A" ? rowData.hashrate : "❌"
              }
            />

            <Column
              label="Temp"
              dataKey="temp"
              width={90}
              style={cellStyle}
              headerStyle={headerStyle}
              cellRenderer={({ rowData }) =>
                rowData.temp && rowData.temp !== "N/A" ? rowData.temp : "❌"
              }
            />

            <Column
              label="Internet"
              dataKey="internet"
              width={90}
              style={cellStyle}
              headerStyle={headerStyle}
              cellRenderer={({ rowData }) => StatusIcon(rowData.internet)}
            />

            <Column
              label="ADB"
              dataKey="adb"
              width={70}
              style={cellStyle}
              headerStyle={headerStyle}
              cellRenderer={({ rowData }) => StatusIcon(rowData.adb)}
            />

            <Column
              label="SSH"
              dataKey="ssh"
              width={120}
              style={cellStyle}
              headerStyle={headerStyle}
              cellRenderer={({ rowData }) =>
                rowData.ssh && rowData.ssh !== "N/A" ? `✅ ${rowData.ssh}` : "❌"
              }
            />

            <Column
              label="Seen"
              dataKey="lastSeen"
              width={120}
              style={cellStyle}
              headerStyle={headerStyle}
              cellRenderer={({ rowData }) =>
                rowData.lastSeen ? new Date(rowData.lastSeen).toLocaleTimeString() : "N/A"
              }
            />

            <Column
              label="Actions"
              dataKey="actions"
              width={100}
              style={cellStyle}
              headerStyle={headerStyle}
              cellRenderer={({ rowData }) => (
                <button
                  onClick={() => {
                    setModalDevice(rowData);
                    setModalOpen(true);
                  }}
                  className="text-cyan-400 hover:text-white text-xs underline"
                >
                  ⚙️ Actions
                </button>
              )}
            />
          </Table>
        )}
      </AutoSizer>
    </div>
  );
}
