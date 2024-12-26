


function exception2string(excp: any): string {
  try {
    const detail: string = excp.response.data.detail;
    return detail;
  } catch {
    if (excp.errorText) {
      return excp.errorText;
    }
    return JSON.stringify(excp);
  }
}

export {
  exception2string,
}



