import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { CDBContainer } from 'cdbreact';
import Chart from 'chart.js/auto';

const ChartCurrency = ({ data }) => {
  return (
    <CDBContainer style={{ width: '100%', height: '100%' }}>
      <h3 className="mt-2">Balance chart</h3>
      <Bar data={data} options={{ responsive: true }} />
    </CDBContainer>
  );
};

export default ChartCurrency;