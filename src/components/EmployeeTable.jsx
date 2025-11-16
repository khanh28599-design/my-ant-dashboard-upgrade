import React from "react";

export default function EmployeeTable({ data, columns }) {
  return (
    <div className="bg-white p-4 rounded-2xl shadow overflow-x-auto">
      <h2 className="text-xl font-semibold mb-4">Chi tiết dữ liệu</h2>
      <table className="min-w-full border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            {columns.map((col, idx) => (
              <th key={idx} className="text-left px-4 py-2 border-b border-gray-200">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {columns.map((col, j) => (
                <td key={j} className="px-4 py-2 border-b border-gray-100">
                  {row[col]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
