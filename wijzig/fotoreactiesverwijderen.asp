<!--#include file="connect.asp" -->
<%
' *** Restrict Access To Page: Grant or deny access to this page
MM_authorizedUsers="1"
MM_authFailedURL="../login.asp"
MM_grantAccess=false
If Session("MM_Username") <> "" Then
  If (false Or CStr(Session("MM_UserAuthorization"))="") Or _
         (InStr(1,MM_authorizedUsers,Session("MM_UserAuthorization"))>=1) Then
    MM_grantAccess = true
  End If
End If
If Not MM_grantAccess Then
  MM_qsChar = "?"
  If (InStr(1,MM_authFailedURL,"?") >= 1) Then MM_qsChar = "&"
  MM_referrer = Request.ServerVariables("URL")
  if (Len(Request.QueryString()) > 0) Then MM_referrer = MM_referrer & "?" & Request.QueryString()
  MM_authFailedURL = MM_authFailedURL & MM_qsChar & "accessdenied=" & Server.URLEncode(MM_referrer)
  Response.Redirect(MM_authFailedURL)
End If
%>
<html>
<head>
<title>Fotoreacties</title>
</head>

<body>
<%
sqlString = "SELECT reeks, reeksnaam FROM tblFotos ORDER BY reeks DESC"
rs.open sqlString
%>
<p align="center">
<form>
<select onChange="location.href=this.value">
	<option>Kies een fotoreeks</option>
	<%while not rs.eof%>
		<option value="fotoreactiesverwijderen.asp?reeks=<%=rs("reeks")%>"><%=rs("reeksnaam")%></option>
		<%rs.movenext
	wend
	rs.close%>
</select>
</form>
</p>

<form method="post" action="fotoreactiesverw.asp">
<%
reeks = trim(request("reeks"))
if reeks <> "" then
	sqlString = "SELECT nr, tekstid, naam, tekst FROM tblFototekst WHERE reeks = " & reeks
	rs.open sqlString
	while not rs.eof%>
		<input type="checkbox" name="<%=rs("nr")%>_<%=rs("tekstid")%>" value="ok"><%=rs("nr")%> - <%=rs("tekstid")%> - <%=rs("naam")%> - <%=rs("tekst")%><br>
		<%rs.movenext
	wend%>
	<input type="hidden" name="reeks" value="<%=reeks%>">
	<input type="submit" value="verwijderen">
<%end if%>
</form>
</body>
</html>